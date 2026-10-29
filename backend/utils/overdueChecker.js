const Repayment = require('../models/Repayment');

/**
 * Calculates start and end of calendar window in Asia/Kolkata timezone.
 * India does not observe Daylight Saving Time (fixed UTC+05:30 offset).
 * @param {Date} [now=new Date()] - Reference timestamp
 * @param {number} [daysAhead=3] - Calendar days ahead for upcoming window
 * @returns {{ startOfTodayIst: Date, endOfWindowIst: Date, todayDateStringIst: string }}
 */
function getIndiaCalendarWindow(now = new Date(), daysAhead = 3) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.format(now); // "YYYY-MM-DD"
  const [year, month, day] = parts.split('-').map(Number);

  // In Asia/Kolkata (UTC+05:30), 00:00:00.000 IST is 18:30:00.000 UTC of previous day
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const startOfDayUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - istOffsetMs;
  const startOfTodayIst = new Date(startOfDayUtcMs);

  // End of day in IST: 23:59:59.999 IST of (day + daysAhead)
  const endOfWindowUtcMs = Date.UTC(year, month - 1, day + daysAhead, 23, 59, 59, 999) - istOffsetMs;
  const endOfWindowIst = new Date(endOfWindowUtcMs);

  return {
    startOfTodayIst,
    endOfWindowIst,
    todayDateStringIst: parts,
  };
}

/**
 * Checks for unpaid/partial installments whose dueDate has passed and marks them OVERDUE.
 * Dispatches non-blocking EMI_OVERDUE notifications.
 * @param {string} [loanId] - Optional specific loan ID filter
 * @returns {Promise<number>} Count of updated overdue repayments
 */
const checkAndUpdateOverdueRepayments = async (loanId = null) => {
  try {
    const query = {
      paymentStatus: { $in: ['PENDING', 'PARTIAL'] },
      dueDate: { $lt: new Date() },
    };

    if (loanId) {
      query.loan = loanId;
    }

    const newlyOverdue = await Repayment.find(query);
    if (!newlyOverdue || newlyOverdue.length === 0) {
      return 0;
    }

    const now = new Date();
    const result = await Repayment.updateMany(query, {
      $set: {
        paymentStatus: 'OVERDUE',
        lastOverdueReminderSentAt: now,
      },
      $inc: { overdueReminderCount: 1 },
    });

    // Fire non-blocking EMI_OVERDUE notifications
    try {
      const { getNotificationService } = require('../services/notificationService');
      const notifyService = getNotificationService();
      for (const rep of newlyOverdue) {
        notifyService
          .notify({
            userId: rep.borrower,
            type: 'EMI_OVERDUE',
            title: 'EMI Overdue Notice',
            body: `Urgent: Your EMI of ₹${Number(rep.amountDue).toLocaleString('en-IN')} for loan #${String(rep.loan).slice(-6)} was due on ${new Date(rep.dueDate).toLocaleDateString('en-IN')} and is now OVERDUE.`,
            entityType: 'Repayment',
            entityId: rep._id,
            metadata: {
              loanId: rep.loan,
              amount: rep.amountDue,
              dueDate: new Date(rep.dueDate).toLocaleDateString('en-IN'),
            },
          })
          .catch((err) => console.error('[notify] EMI_OVERDUE async error:', err.message));
      }
    } catch (notifErr) {
      console.error('[notify] EMI_OVERDUE error:', notifErr.message);
    }

    return result.modifiedCount || 0;
  } catch (error) {
    console.error('Error updating overdue repayments:', error.message);
    return 0;
  }
};

/**
 * Sends EMI_UPCOMING reminders for installments due within the next 1–3 days in IST.
 *
 * Guarantees:
 * 1. Persistent deduplication: installments that have received an upcoming reminder
 *    are never sent again across server restarts or repeated runs.
 * 2. Race condition safety: uses atomic findOneAndUpdate to claim the installment
 *    so concurrent workers or clustered instances cannot send duplicate reminders.
 * 3. India calendar boundaries: uses Asia/Kolkata day boundaries.
 * 4. Failure isolation: notification failures do not crash the runner or abort remaining reminders.
 *
 * @param {object} [options]
 * @param {Date} [options.now] - Optional reference timestamp (defaults to current Date)
 * @returns {Promise<number>} Count of reminders sent
 */
const sendEmiUpcomingReminders = async (options = {}) => {
  try {
    const now = options.now || new Date();
    const { startOfTodayIst, endOfWindowIst } = getIndiaCalendarWindow(now, 3);

    // Query installments in the 3-day IST window that have not yet had a reminder dispatched
    const query = {
      paymentStatus: { $in: ['PENDING', 'PARTIAL'] },
      dueDate: { $gte: startOfTodayIst, $lte: endOfWindowIst },
      $or: [
        { lastUpcomingReminderSentAt: null },
        { lastUpcomingReminderSentAt: { $exists: false } },
      ],
    };

    const upcoming = await Repayment.find(query);
    if (!upcoming || upcoming.length === 0) {
      return 0;
    }

    const { getNotificationService } = require('../services/notificationService');
    const notifyService = getNotificationService();
    let sent = 0;

    for (const rep of upcoming) {
      // Atomic claim guard: only the single worker that successfully updates
      // lastUpcomingReminderSentAt from null -> Date will process the reminder.
      const claimed = await Repayment.findOneAndUpdate(
        {
          _id: rep._id,
          paymentStatus: { $in: ['PENDING', 'PARTIAL'] },
          $or: [
            { lastUpcomingReminderSentAt: null },
            { lastUpcomingReminderSentAt: { $exists: false } },
          ],
        },
        {
          $set: { lastUpcomingReminderSentAt: new Date() },
          $inc: { upcomingReminderCount: 1 },
        },
        { returnDocument: 'after' }
      );

      // If another worker claimed this installment concurrently, skip safely
      if (!claimed) {
        continue;
      }

      try {
        await notifyService.notify({
          userId: claimed.borrower,
          type: 'EMI_UPCOMING',
          title: 'EMI Due Reminder',
          body: `Reminder: Your EMI of ₹${Number(claimed.amountDue).toLocaleString('en-IN')} for loan #${String(claimed.loan).slice(-6)} is due on ${new Date(claimed.dueDate).toLocaleDateString('en-IN')}. Please ensure timely repayment.`,
          entityType: 'Repayment',
          entityId: claimed._id,
          metadata: {
            loanId: claimed.loan,
            amount: claimed.amountDue,
            dueDate: new Date(claimed.dueDate).toLocaleDateString('en-IN'),
          },
        });
        sent++;
      } catch (err) {
        console.error(`[notify] EMI_UPCOMING async error for repayment ${claimed._id}:`, err.message);
      }
    }

    console.info(`[EMI Reminder] Dispatched ${sent} upcoming EMI reminder(s)`);
    return sent;
  } catch (error) {
    console.error('[EMI Reminder] Error sending upcoming EMI reminders:', error.message);
    return 0;
  }
};

module.exports = checkAndUpdateOverdueRepayments;
module.exports.checkAndUpdateOverdueRepayments = checkAndUpdateOverdueRepayments;
module.exports.sendEmiUpcomingReminders = sendEmiUpcomingReminders;
module.exports.getIndiaCalendarWindow = getIndiaCalendarWindow;
