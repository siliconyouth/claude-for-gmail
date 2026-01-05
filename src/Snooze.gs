/**
 * Snooze / Remind Later
 * Snooze emails and get reminded at the right time
 */

// Preference keys
const PREF_SNOOZED_EMAILS = 'snoozed_emails';
const SNOOZE_LABEL_NAME = 'AI/Snoozed';

/**
 * Snooze an email until a specific time
 * @param {string} messageId - Gmail message ID
 * @param {Date} remindAt - When to remind
 * @param {string} note - Optional note for reminder
 * @returns {Object} Snooze info
 */
function snoozeEmail(messageId, remindAt, note) {
  if (remindAt <= new Date()) {
    throw new Error('Snooze time must be in the future');
  }

  const message = GmailApp.getMessageById(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  const thread = message.getThread();

  // Create snooze record
  const snoozeRecord = {
    id: 'snooze_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    messageId: messageId,
    threadId: thread.getId(),
    subject: message.getSubject(),
    from: message.getFrom(),
    remindAt: remindAt.toISOString(),
    note: note || '',
    snoozedAt: new Date().toISOString(),
    status: 'snoozed'
  };

  // Add snooze label and archive
  const snoozeLabel = getOrCreateLabel(SNOOZE_LABEL_NAME);
  thread.addLabel(snoozeLabel);
  thread.moveToArchive();

  // Mark as read to clean inbox
  thread.markRead();

  // Save snooze record
  const snoozed = getPreference(PREF_SNOOZED_EMAILS, []);
  snoozed.push(snoozeRecord);
  setPreference(PREF_SNOOZED_EMAILS, snoozed);

  // Ensure scheduler is running
  ensureSchedulerRunning();

  // Track analytics
  trackFeatureUsage('email_snoozed');

  Logger.log('Email snoozed until: ' + remindAt.toISOString());

  return {
    id: snoozeRecord.id,
    remindAt: snoozeRecord.remindAt,
    status: 'snoozed'
  };
}

/**
 * Unsnooze an email immediately
 * @param {string} snoozeId - Snooze record ID
 * @returns {boolean} Success
 */
function unsnoozeEmail(snoozeId) {
  const snoozed = getPreference(PREF_SNOOZED_EMAILS, []);
  const record = snoozed.find(function(s) { return s.id === snoozeId; });

  if (!record) {
    return false;
  }

  try {
    const thread = GmailApp.getThreadById(record.threadId);
    if (thread) {
      // Remove snooze label
      const snoozeLabel = GmailApp.getUserLabelByName(SNOOZE_LABEL_NAME);
      if (snoozeLabel) {
        thread.removeLabel(snoozeLabel);
      }

      // Move back to inbox
      thread.moveToInbox();
      thread.markUnread();
    }

    // Update record
    record.status = 'unsnoozed';
    record.unsnoozeAt = new Date().toISOString();
    setPreference(PREF_SNOOZED_EMAILS, snoozed);

    return true;

  } catch (e) {
    Logger.log('Unsnooze error: ' + e.message);
    return false;
  }
}

/**
 * Update snooze time
 * @param {string} snoozeId - Snooze record ID
 * @param {Date} newRemindAt - New reminder time
 * @returns {Object} Updated snooze info
 */
function updateSnoozeTime(snoozeId, newRemindAt) {
  if (newRemindAt <= new Date()) {
    throw new Error('Snooze time must be in the future');
  }

  const snoozed = getPreference(PREF_SNOOZED_EMAILS, []);
  const record = snoozed.find(function(s) { return s.id === snoozeId; });

  if (!record) {
    throw new Error('Snooze record not found');
  }

  record.remindAt = newRemindAt.toISOString();
  record.updatedAt = new Date().toISOString();

  setPreference(PREF_SNOOZED_EMAILS, snoozed);

  return {
    id: record.id,
    remindAt: record.remindAt,
    status: 'updated'
  };
}

/**
 * Check and process due snooze reminders
 * Called by the unified scheduler
 */
function checkSnoozeReminders() {
  const snoozed = getPreference(PREF_SNOOZED_EMAILS, []);
  const now = new Date();
  let updated = false;

  snoozed.forEach(function(record) {
    if (record.status !== 'snoozed') return;

    const remindAt = new Date(record.remindAt);

    if (remindAt <= now) {
      try {
        // Bring email back
        const thread = GmailApp.getThreadById(record.threadId);

        if (thread) {
          // Remove snooze label
          const snoozeLabel = GmailApp.getUserLabelByName(SNOOZE_LABEL_NAME);
          if (snoozeLabel) {
            thread.removeLabel(snoozeLabel);
          }

          // Move to inbox and mark unread
          thread.moveToInbox();
          thread.markUnread();

          // Add a reminder label if note exists
          if (record.note) {
            addReminderNote(thread, record.note);
          }

          record.status = 'reminded';
          record.remindedAt = new Date().toISOString();

          Logger.log('Snooze reminder triggered: ' + record.id);
        } else {
          record.status = 'failed';
          record.error = 'Thread not found';
        }

      } catch (e) {
        record.status = 'failed';
        record.error = e.message;
        Logger.log('Snooze reminder error: ' + e.message);
      }

      updated = true;
    }
  });

  if (updated) {
    // Clean up old records (keep last 100)
    const active = snoozed.filter(function(s) { return s.status === 'snoozed'; });
    const completed = snoozed.filter(function(s) { return s.status !== 'snoozed'; }).slice(-100);

    setPreference(PREF_SNOOZED_EMAILS, active.concat(completed));
  }
}

/**
 * Add reminder note to thread
 * @param {GmailThread} thread - The thread
 * @param {string} note - The note
 */
function addReminderNote(thread, note) {
  // Add a label with the note indicator
  const reminderLabel = getOrCreateLabel('AI/Reminder');
  thread.addLabel(reminderLabel);

  // Could also star the thread
  thread.getMessages()[0].star();
}

/**
 * Get all snoozed emails
 * @returns {Array} Array of snoozed email records
 */
function getSnoozedEmails() {
  return getPreference(PREF_SNOOZED_EMAILS, [])
    .filter(function(s) { return s.status === 'snoozed'; })
    .sort(function(a, b) { return new Date(a.remindAt) - new Date(b.remindAt); });
}

/**
 * Check if there are due snooze reminders
 * @returns {boolean}
 */
function hasSnoozedEmails() {
  const snoozed = getSnoozedEmails();
  const now = new Date();

  return snoozed.some(function(s) {
    return new Date(s.remindAt) <= now;
  });
}

/**
 * Get quick snooze options
 * @returns {Array} Array of quick snooze options
 */
function getQuickSnoozeOptions() {
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

  // This evening
  const evening = new Date(now);
  evening.setHours(20, 0, 0, 0);
  if (evening > now) {
    options.push({
      label: 'This evening (8:00 PM)',
      time: evening
    });
  }

  // Tomorrow morning
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  options.push({
    label: 'Tomorrow morning (9:00 AM)',
    time: tomorrow
  });

  // Next week
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);
  options.push({
    label: 'Next week',
    time: nextWeek
  });

  // Next month
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setHours(9, 0, 0, 0);
  options.push({
    label: 'Next month',
    time: nextMonth
  });

  return options;
}

/**
 * Format snooze time for display
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted string
 */
function formatSnoozeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 24) {
    return 'Today at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays < 2) {
    return 'Tomorrow at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
}
