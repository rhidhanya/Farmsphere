/**
 * FarmSphere — Background EMI Reminder & Overdue Scheduler
 *
 * Lightweight, zero-dependency daily runner using native Node.js timers.
 * - Starts only once per application instance.
 * - Handles all errors internally; never crashes the main server process.
 * - Automatically executes checkAndUpdateOverdueRepayments() and sendEmiUpcomingReminders().
 * - Safe for testing and clustering (supports clean shutdown and test-mode skip).
 */

const {
  checkAndUpdateOverdueRepayments,
  sendEmiUpcomingReminders,
} = require('../utils/overdueChecker');

let timerHandle = null;
let isStarted = false;
let isExecuting = false;

/**
 * Executes a single complete EMI check run:
 * 1. Overdue transitions (marks past-due installments OVERDUE and sends notices).
 * 2. Upcoming EMI reminders (dispatches deduplicated reminders in 3-day IST window).
 * @returns {Promise<{ overdueUpdated: number, upcomingRemindersSent: number, durationMs: number }>}
 */
async function triggerEmiReminderRun() {
  if (isExecuting) {
    console.info('[Scheduler] EMI reminder run already in progress — skipping duplicate tick');
    return { overdueUpdated: 0, upcomingRemindersSent: 0, durationMs: 0, inProgress: true };
  }

  isExecuting = true;
  const start = Date.now();

  try {
    console.info('[Scheduler] Starting daily EMI check cycle...');

    // 1. Process overdue repayments
    const overdueCount = await checkAndUpdateOverdueRepayments();

    // 2. Process upcoming reminders (deduplicated per installment)
    const upcomingCount = await sendEmiUpcomingReminders();

    const durationMs = Date.now() - start;
    console.info(
      `[Scheduler] EMI check cycle completed in ${durationMs}ms: ` +
      `${overdueCount} overdue updated, ${upcomingCount} upcoming reminders dispatched.`
    );

    return {
      overdueUpdated: overdueCount,
      upcomingRemindersSent: upcomingCount,
      durationMs,
    };
  } catch (err) {
    console.error('[Scheduler] Error during scheduled EMI run:', err.message);
    return {
      overdueUpdated: 0,
      upcomingRemindersSent: 0,
      durationMs: Date.now() - start,
      error: err.message,
    };
  } finally {
    isExecuting = false;
  }
}

/**
 * Starts the EMI reminder scheduler.
 * Runs once after initial delay (default: 5 seconds), then repeats every interval.
 *
 * Default interval: 24 hours (configurable via REMINDER_INTERVAL_HOURS env var).
 *
 * @param {object} [options]
 * @param {number} [options.intervalMs] - Custom repeat interval in ms
 * @param {number} [options.initialDelayMs=5000] - Initial delay before first run
 * @returns {boolean} True if started, false if already running or skipped
 */
function startEmiReminderScheduler(options = {}) {
  // Never start multiple timers in the same process
  if (isStarted) {
    return false;
  }

  // Skip auto-scheduling in test mode unless explicitly enabled
  if (process.env.NODE_ENV === 'test' && !options.forceInTest) {
    return false;
  }

  if (process.env.DISABLE_SCHEDULER === 'true') {
    console.info('[Scheduler] EMI scheduler disabled via DISABLE_SCHEDULER=true');
    return false;
  }

  const hours = Number(process.env.REMINDER_INTERVAL_HOURS) || 24;
  const intervalMs = options.intervalMs || hours * 60 * 60 * 1000;
  const initialDelayMs = options.initialDelayMs !== undefined ? options.initialDelayMs : 5000;

  isStarted = true;

  // Initial delayed execution so server finishes startup and DB connects cleanly
  timerHandle = setTimeout(async () => {
    await triggerEmiReminderRun();

    // Set recurring interval
    timerHandle = setInterval(async () => {
      await triggerEmiReminderRun();
    }, intervalMs);

    // Unref so the timer does not prevent process exit during tests or shutdown
    if (timerHandle && typeof timerHandle.unref === 'function') {
      timerHandle.unref();
    }
  }, initialDelayMs);

  if (timerHandle && typeof timerHandle.unref === 'function') {
    timerHandle.unref();
  }

  console.info(`[Scheduler] EMI reminder scheduler registered (Interval: ${hours}h, initial delay: ${initialDelayMs}ms)`);
  return true;
}

/**
 * Stops the scheduler and clears any active timers.
 */
function stopEmiReminderScheduler() {
  if (timerHandle) {
    clearTimeout(timerHandle);
    clearInterval(timerHandle);
    timerHandle = null;
  }
  isStarted = false;
  isExecuting = false;
  return true;
}

/**
 * Returns true if the scheduler is actively registered.
 */
function isSchedulerRunning() {
  return isStarted;
}

module.exports = {
  startEmiReminderScheduler,
  stopEmiReminderScheduler,
  isSchedulerRunning,
  triggerEmiReminderRun,
};
