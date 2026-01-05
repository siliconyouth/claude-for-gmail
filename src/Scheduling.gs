/**
 * Email Scheduling
 * Schedule emails to send at a specific time
 */

// Preference keys
const PREF_SCHEDULED_EMAILS = 'scheduled_emails';

/**
 * Schedule an email to be sent later
 * @param {Object} emailData - Email data
 * @param {Date} sendAt - When to send
 * @returns {Object} Scheduled email info
 */
function scheduleEmail(emailData, sendAt) {
  if (!emailData.to || !emailData.subject) {
    throw new Error('Email must have recipient and subject');
  }

  if (sendAt <= new Date()) {
    throw new Error('Scheduled time must be in the future');
  }

  const scheduledEmail = {
    id: 'sched_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    to: emailData.to,
    cc: emailData.cc || '',
    bcc: emailData.bcc || '',
    subject: emailData.subject,
    body: emailData.body,
    isHtml: emailData.isHtml || false,
    replyToMessageId: emailData.replyToMessageId || null,
    sendAt: sendAt.toISOString(),
    createdAt: new Date().toISOString(),
    status: 'scheduled'
  };

  // Get existing scheduled emails
  const scheduled = getPreference(PREF_SCHEDULED_EMAILS, []);

  // Add new one
  scheduled.push(scheduledEmail);

  // Save
  setPreference(PREF_SCHEDULED_EMAILS, scheduled);

  // Ensure scheduler is running
  ensureSchedulerRunning();

  // Track analytics
  trackFeatureUsage('email_scheduled');

  Logger.log('Email scheduled for: ' + sendAt.toISOString());

  return {
    id: scheduledEmail.id,
    sendAt: scheduledEmail.sendAt,
    status: 'scheduled'
  };
}

/**
 * Schedule a draft to be sent later
 * @param {string} draftId - Draft ID
 * @param {Date} sendAt - When to send
 * @returns {Object} Scheduled email info
 */
function scheduleDraft(draftId, sendAt) {
  const draft = GmailApp.getDraft(draftId);

  if (!draft) {
    throw new Error('Draft not found');
  }

  const message = draft.getMessage();

  const emailData = {
    to: message.getTo(),
    cc: message.getCc(),
    bcc: message.getBcc(),
    subject: message.getSubject(),
    body: message.getBody(),
    isHtml: true,
    draftId: draftId
  };

  return scheduleEmail(emailData, sendAt);
}

/**
 * Cancel a scheduled email
 * @param {string} scheduledId - Scheduled email ID
 * @returns {boolean} Whether cancellation was successful
 */
function cancelScheduledEmail(scheduledId) {
  const scheduled = getPreference(PREF_SCHEDULED_EMAILS, []);

  const index = scheduled.findIndex(function(e) { return e.id === scheduledId; });

  if (index === -1) {
    return false;
  }

  scheduled.splice(index, 1);
  setPreference(PREF_SCHEDULED_EMAILS, scheduled);

  Logger.log('Cancelled scheduled email: ' + scheduledId);

  return true;
}

/**
 * Reschedule an email
 * @param {string} scheduledId - Scheduled email ID
 * @param {Date} newSendAt - New send time
 * @returns {Object} Updated scheduled email
 */
function rescheduleEmail(scheduledId, newSendAt) {
  if (newSendAt <= new Date()) {
    throw new Error('New time must be in the future');
  }

  const scheduled = getPreference(PREF_SCHEDULED_EMAILS, []);

  const email = scheduled.find(function(e) { return e.id === scheduledId; });

  if (!email) {
    throw new Error('Scheduled email not found');
  }

  email.sendAt = newSendAt.toISOString();
  email.updatedAt = new Date().toISOString();

  setPreference(PREF_SCHEDULED_EMAILS, scheduled);

  return {
    id: email.id,
    sendAt: email.sendAt,
    status: 'rescheduled'
  };
}

/**
 * Get all scheduled emails
 * @returns {Array} Array of scheduled emails
 */
function getScheduledEmails() {
  return getPreference(PREF_SCHEDULED_EMAILS, [])
    .filter(function(e) { return e.status === 'scheduled'; })
    .sort(function(a, b) { return new Date(a.sendAt) - new Date(b.sendAt); });
}

/**
 * Send due scheduled emails
 * Called by the unified scheduler
 */
function sendScheduledEmails() {
  const scheduled = getPreference(PREF_SCHEDULED_EMAILS, []);
  const now = new Date();
  let updated = false;

  scheduled.forEach(function(email) {
    if (email.status !== 'scheduled') return;

    const sendAt = new Date(email.sendAt);

    if (sendAt <= now) {
      try {
        sendScheduledEmailNow(email);
        email.status = 'sent';
        email.sentAt = new Date().toISOString();
        Logger.log('Sent scheduled email: ' + email.id);
      } catch (e) {
        email.status = 'failed';
        email.error = e.message;
        Logger.log('Failed to send scheduled email: ' + email.id + ' - ' + e.message);
      }
      updated = true;
    }
  });

  if (updated) {
    // Clean up old sent/failed emails (keep last 50)
    const cleaned = scheduled.filter(function(e) {
      return e.status === 'scheduled';
    }).concat(
      scheduled.filter(function(e) {
        return e.status !== 'scheduled';
      }).slice(-50)
    );

    setPreference(PREF_SCHEDULED_EMAILS, cleaned);
  }
}

/**
 * Actually send a scheduled email
 * @param {Object} email - Scheduled email object
 */
function sendScheduledEmailNow(email) {
  if (email.replyToMessageId) {
    // This is a reply
    const message = GmailApp.getMessageById(email.replyToMessageId);
    if (message) {
      message.reply(email.body, {
        cc: email.cc,
        bcc: email.bcc,
        htmlBody: email.isHtml ? email.body : null
      });
    } else {
      throw new Error('Original message not found');
    }
  } else {
    // New email
    GmailApp.sendEmail(email.to, email.subject, email.isHtml ? '' : email.body, {
      cc: email.cc,
      bcc: email.bcc,
      htmlBody: email.isHtml ? email.body : null
    });
  }
}

/**
 * Check if there are any due scheduled emails
 * @returns {boolean}
 */
function hasScheduledEmails() {
  const scheduled = getScheduledEmails();
  const now = new Date();

  return scheduled.some(function(e) {
    return new Date(e.sendAt) <= now;
  });
}

/**
 * Get quick schedule options
 * @returns {Array} Array of quick schedule options
 */
function getQuickScheduleOptions() {
  const now = new Date();

  const options = [];

  // Later today (if before 5 PM)
  if (now.getHours() < 17) {
    const laterToday = new Date(now);
    laterToday.setHours(17, 0, 0, 0);
    options.push({
      label: 'Later today (5:00 PM)',
      time: laterToday
    });
  }

  // Tomorrow morning
  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(9, 0, 0, 0);
  options.push({
    label: 'Tomorrow morning (9:00 AM)',
    time: tomorrowMorning
  });

  // Tomorrow afternoon
  const tomorrowAfternoon = new Date(now);
  tomorrowAfternoon.setDate(tomorrowAfternoon.getDate() + 1);
  tomorrowAfternoon.setHours(14, 0, 0, 0);
  options.push({
    label: 'Tomorrow afternoon (2:00 PM)',
    time: tomorrowAfternoon
  });

  // Next Monday (if not already Monday)
  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
  nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
  nextMonday.setHours(9, 0, 0, 0);
  options.push({
    label: 'Monday morning (9:00 AM)',
    time: nextMonday
  });

  return options;
}

/**
 * Format scheduled time for display
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted string
 */
function formatScheduledTime(isoString) {
  const date = new Date(isoString);
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  };
  return date.toLocaleDateString('en-US', options);
}
