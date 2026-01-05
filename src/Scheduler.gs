/**
 * Unified Scheduler for Claude for Gmail
 *
 * Add-ons are limited to 1 time-based trigger per user.
 * This scheduler combines auto-labeling and daily digest into one trigger.
 */

// Preference keys for enabled features
const PREF_AUTO_LABEL_ENABLED = 'auto_label_enabled';
const PREF_DIGEST_ENABLED = 'digest_enabled';
const PREF_DIGEST_HOUR = 'digest_hour';
const PREF_LAST_DIGEST_DATE = 'last_digest_date';

/**
 * Main scheduled task - runs hourly
 * Executes enabled features based on preferences
 */
function runScheduledTasks() {
  Logger.log('Running scheduled tasks...');

  const autoLabelEnabled = getPreference(PREF_AUTO_LABEL_ENABLED, false);
  const digestEnabled = getPreference(PREF_DIGEST_ENABLED, false);

  // Run auto-labeling if enabled (every hour)
  if (autoLabelEnabled) {
    try {
      Logger.log('Running auto-label...');
      autoLabelUnreadEmails();
    } catch (error) {
      Logger.log('Auto-label error: ' + error.message);
    }
  }

  // Run digest if enabled and it's the right time (default 8 AM)
  if (digestEnabled) {
    const digestHour = getPreference(PREF_DIGEST_HOUR, 8);
    const now = new Date();
    const currentHour = now.getHours();

    // Check if it's the digest hour and we haven't sent today
    if (currentHour === digestHour && !hasDigestSentToday()) {
      try {
        Logger.log('Sending daily digest...');
        sendDailyDigest();
        markDigestSent();
      } catch (error) {
        Logger.log('Digest error: ' + error.message);
      }
    }
  }

  Logger.log('Scheduled tasks complete');
}

/**
 * Check if digest was already sent today
 * @returns {boolean}
 */
function hasDigestSentToday() {
  const lastSent = getPreference(PREF_LAST_DIGEST_DATE, '');
  const today = new Date().toDateString();
  return lastSent === today;
}

/**
 * Mark digest as sent for today
 */
function markDigestSent() {
  const today = new Date().toDateString();
  setPreference(PREF_LAST_DIGEST_DATE, today);
}

/**
 * Set up the unified scheduler trigger (runs every hour)
 */
function setupSchedulerTrigger() {
  // Remove ALL existing triggers first
  removeSchedulerTrigger();

  // Safety check
  const existingTriggers = ScriptApp.getProjectTriggers();
  if (existingTriggers.length > 0) {
    Logger.log('Warning: ' + existingTriggers.length + ' triggers still exist');
    // Clean them all
    existingTriggers.forEach(function(trigger) {
      ScriptApp.deleteTrigger(trigger);
    });
  }

  // Create single unified trigger
  ScriptApp.newTrigger('runScheduledTasks')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('Unified scheduler trigger created (runs every hour)');
}

/**
 * Remove the scheduler trigger
 */
function removeSchedulerTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  Logger.log('All triggers removed');
}

/**
 * Enable auto-labeling feature
 */
function enableAutoLabel() {
  setPreference(PREF_AUTO_LABEL_ENABLED, true);
  ensureSchedulerRunning();
  Logger.log('Auto-labeling enabled');
}

/**
 * Disable auto-labeling feature
 */
function disableAutoLabel() {
  setPreference(PREF_AUTO_LABEL_ENABLED, false);
  checkAndRemoveSchedulerIfUnneeded();
  Logger.log('Auto-labeling disabled');
}

/**
 * Enable daily digest feature
 * @param {number} hour - Hour to send digest (0-23, default 8)
 */
function enableDigest(hour) {
  setPreference(PREF_DIGEST_ENABLED, true);
  setPreference(PREF_DIGEST_HOUR, hour || 8);
  ensureSchedulerRunning();
  Logger.log('Daily digest enabled for hour: ' + (hour || 8));
}

/**
 * Disable daily digest feature
 */
function disableDigest() {
  setPreference(PREF_DIGEST_ENABLED, false);
  checkAndRemoveSchedulerIfUnneeded();
  Logger.log('Daily digest disabled');
}

/**
 * Ensure scheduler is running if any feature is enabled
 */
function ensureSchedulerRunning() {
  const triggers = ScriptApp.getProjectTriggers();
  const hasScheduler = triggers.some(function(trigger) {
    return trigger.getHandlerFunction() === 'runScheduledTasks';
  });

  if (!hasScheduler) {
    setupSchedulerTrigger();
  }
}

/**
 * Remove scheduler if no features are enabled
 */
function checkAndRemoveSchedulerIfUnneeded() {
  const autoLabelEnabled = getPreference(PREF_AUTO_LABEL_ENABLED, false);
  const digestEnabled = getPreference(PREF_DIGEST_ENABLED, false);

  if (!autoLabelEnabled && !digestEnabled) {
    removeSchedulerTrigger();
    Logger.log('No features enabled, scheduler removed');
  }
}

/**
 * Get status of all scheduled features
 * @returns {Object} Status object
 */
function getSchedulerStatus() {
  const triggers = ScriptApp.getProjectTriggers();

  return {
    autoLabelEnabled: getPreference(PREF_AUTO_LABEL_ENABLED, false),
    digestEnabled: getPreference(PREF_DIGEST_ENABLED, false),
    digestHour: getPreference(PREF_DIGEST_HOUR, 8),
    schedulerRunning: triggers.some(t => t.getHandlerFunction() === 'runScheduledTasks'),
    totalTriggers: triggers.length
  };
}
