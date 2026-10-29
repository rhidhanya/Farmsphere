class InAppNotificationProvider {
  constructor({ Notification }) {
    this.Notification = Notification;
    this.name = 'inapp';
  }

  async send({ userId, type, title, body, entityType, entityId, metadata, idempotencyKey }) {
    const doc = await this.Notification.create({
      user: userId,
      type,
      title,
      body,
      entityType: entityType || 'None',
      entityId,
      metadata: metadata || {},
      idempotencyKey,
      deliveryTracking: {
        email: { status: 'none' },
      },
    });
    return { provider: this.name, delivered: true, id: doc._id };
  }
}

class WhatsAppProvider {
  constructor() {
    this.name = 'whatsapp';
    this.configured = Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  async send(payload) {
    if (!this.configured) {
      return { provider: this.name, delivered: false, reason: 'not configured' };
    }
    return { provider: this.name, delivered: false, reason: 'adapter not wired' };
  }
}

class NotificationService {
  constructor({ Notification, providers }) {
    this.Notification = Notification;
    this.providers = providers;
  }

  async notify(payload) {
    if (!payload?.userId || !payload?.type || !payload?.title || !payload?.body) {
      return null;
    }

    // 1. Idempotency Check
    const eventKey =
      payload.idempotencyKey ||
      `${payload.entityType || 'None'}_${payload.entityId || payload.userId}_${payload.type}`;

    try {
      const existing = await this.Notification.findOne({ idempotencyKey: eventKey });
      if (existing) {
        console.info(`[NotificationService] Duplicate event suppressed by idempotency key: ${eventKey}`);
        return [
          {
            provider: 'inapp',
            delivered: false,
            duplicate: true,
            id: existing._id,
            reason: 'Duplicate event suppressed by idempotency key',
          },
        ];
      }
    } catch (checkErr) {
      console.warn('[NotificationService] Idempotency check warning:', checkErr.message);
    }

    // 2. Create In-App Notification document
    let notifDoc = null;
    try {
      notifDoc = await this.Notification.create({
        user: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityType: payload.entityType || 'None',
        entityId: payload.entityId,
        idempotencyKey: eventKey,
        metadata: payload.metadata || {},
        deliveryTracking: {
          email: { status: 'none' },
        },
      });
    } catch (createErr) {
      // In case of a unique index collision on idempotencyKey from concurrent request
      if (createErr.code === 11000) {
        console.info(`[NotificationService] Concurrent duplicate suppressed: ${eventKey}`);
        return [{ provider: 'inapp', delivered: false, duplicate: true, reason: 'Duplicate event suppressed' }];
      }
      console.error('[NotificationService] DB create failed:', createErr.message);
    }

    const results = [
      {
        provider: 'inapp',
        delivered: Boolean(notifDoc),
        id: notifDoc?._id,
      },
    ];

    // 3. Dispatch to external providers (Email, WhatsApp)
    for (const provider of this.providers) {
      if (provider.name === 'inapp') continue;
      try {
        const res = await provider.send({ ...payload, notificationId: notifDoc?._id });
        results.push(res);

        // Update tracking on Notification document if document exists
        if (notifDoc?._id && provider.name === 'email' && res) {
          const emailUpdate = {
            'deliveryTracking.email.provider': res.providerUsed || res.provider || 'none',
            'deliveryTracking.email.status': res.delivered ? 'sent' : 'failed',
            'deliveryTracking.email.messageId': res.messageId || null,
            'deliveryTracking.email.sentAt': res.delivered ? new Date() : null,
          };
          await this.Notification.findByIdAndUpdate(notifDoc._id, { $set: emailUpdate });
        }
      } catch (err) {
        console.error(`[NotificationService] ${provider.name} failed:`, err.message);
      }
    }

    return results;
  }
}

let singleton;

const getNotificationService = () => {
  if (!singleton) {
    const Notification = require('../models/Notification');
    const { getEmailService } = require('./emailService');
    singleton = new NotificationService({
      Notification,
      providers: [
        new InAppNotificationProvider({ Notification }),
        getEmailService(),
        new WhatsAppProvider(),
      ],
    });
  }
  return singleton;
};

module.exports = {
  NotificationService,
  InAppNotificationProvider,
  WhatsAppProvider,
  getNotificationService,
};
