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
const PREF_LAST_DIGEST_TIMESTAMP = 'last_digest_timestamp';
const PREF_SCHEDULING_ENABLED = 'scheduling_enabled';
const PREF_SNOOZE_ENABLED = 'snooze_enabled';
const PREF_CACHE_MAINTENANCE_ENABLED = 'cache_maintenance_enabled';

/**
 * Main scheduled task - runs hourly
 * Executes enabled features based on preferences
 */
function runScheduledTasks() {
  Logger.log('Running scheduled tasks at ' + new Date().toISOString());

  const results = {
    autoLabel: null,
    digest: null,
    scheduling: null,
    snooze: null,
    cache: null
  };

  // 1. Auto-labeling (if enabled)
  const autoLabelEnabled = getPreference(PREF_AUTO_LABEL_ENABLED, false);
  if (autoLabelEnabled) {
    try {
      Logger.log('Running auto-label...');
      autoLabelUnreadEmails();
      results.autoLabel = 'success';
    } catch (error) {
      Logger.log('Auto-label error: ' + error.message);
      results.autoLabel = 'error: ' + error.message;
      trackError('scheduler:auto-label', error);
    }
  }

  // 2. Daily digest (if enabled and right time)
  const digestEnabled = getPreference(PREF_DIGEST_ENABLED, false);
  if (digestEnabled) {
    const digestHour = getPreference(PREF_DIGEST_HOUR, 8);
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour === digestHour && !hasDigestSentToday()) {
      try {
        Logger.log('Sending daily digest...');
        sendDailyDigest();
        markDigestSent();
        results.digest = 'sent';
      } catch (error) {
        Logger.log('Digest error: ' + error.message);
        results.digest = 'error: ' + error.message;
        trackError('scheduler:digest', error);
      }
    } else {
      results.digest = 'skipped (not time)';
    }
  }

  // 3. Send scheduled emails (always check)
  try {
    const scheduledEmails = getScheduledEmails();
    if (scheduledEmails.length > 0 || hasScheduledEmails()) {
      Logger.log('Processing ' + scheduledEmails.length + ' scheduled emails...');
      sendScheduledEmails();
      results.scheduling = 'processed';
    } else {
      results.scheduling = 'none pending';
    }
  } catch (error) {
    Logger.log('Scheduled email error: ' + error.message);
    results.scheduling = 'error: ' + error.message;
    trackError('scheduler:email-scheduling', error);
  }

  // 4. Check snooze reminders (always check)
  try {
    const snoozedEmails = getSnoozedEmails();
    if (snoozedEmails.length > 0 || hasSnoozedEmails()) {
      Logger.log('Processing ' + snoozedEmails.length + ' snoozed emails...');
      checkSnoozeReminders();
      results.snooze = 'processed';
    } else {
      results.snooze = 'none pending';
    }
  } catch (error) {
    Logger.log('Snooze error: ' + error.message);
    results.snooze = 'error: ' + error.message;
    trackError('scheduler:snooze', error);
  }

  // 5. Cache maintenance (if needed)
  try {
    if (needsCacheMaintenance()) {
      Logger.log('Running cache maintenance...');
      runCacheMaintenance();
      results.cache = 'maintained';
    } else {
      results.cache = 'not needed';
    }
  } catch (error) {
    Logger.log('Cache maintenance error: ' + error.message);
    results.cache = 'error: ' + error.message;
    // Don't track cache errors - they're not critical
  }

  // 6. Process revalidation queue (always)
  try {
    processRevalidationQueue();
  } catch (error) {
    Logger.log('Revalidation queue error: ' + error.message);
  }

  // Log summary
  Logger.log('Scheduled tasks complete: ' + JSON.stringify(results));

  // Track scheduler run
  trackFeatureUsage('scheduler_run');

  return results;
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
 * Mark digest as sent and store timestamp
 */
function markDigestSent() {
  const now = new Date();
  setPreference(PREF_LAST_DIGEST_DATE, now.toDateString());
  setPreference(PREF_LAST_DIGEST_TIMESTAMP, now.getTime());
}

/**
 * Get the timestamp of the last digest sent
 * @returns {Date|null} Date of last digest or null if never sent
 */
function getLastDigestTimestamp() {
  const timestamp = getPreference(PREF_LAST_DIGEST_TIMESTAMP, null);
  if (timestamp) {
    return new Date(timestamp);
  }
  return null;
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
  const hasScheduled = getScheduledEmails().length > 0;
  const hasSnoozed = getSnoozedEmails().length > 0;

  // Keep scheduler running if any feature is active or there are pending items
  if (!autoLabelEnabled && !digestEnabled && !hasScheduled && !hasSnoozed) {
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
  const scheduledEmails = getScheduledEmails();
  const snoozedEmails = getSnoozedEmails();

  return {
    autoLabelEnabled: getPreference(PREF_AUTO_LABEL_ENABLED, false),
    digestEnabled: getPreference(PREF_DIGEST_ENABLED, false),
    digestHour: getPreference(PREF_DIGEST_HOUR, 8),
    schedulerRunning: triggers.some(function(t) { return t.getHandlerFunction() === 'runScheduledTasks'; }),
    totalTriggers: triggers.length,
    scheduledEmailCount: scheduledEmails.length,
    snoozedEmailCount: snoozedEmails.length,
    lastDigestDate: getPreference(PREF_LAST_DIGEST_DATE, null),
    cacheStats: getCacheStats()
  };
}

/**
 * Run scheduler manually (for testing)
 */
function runSchedulerManually() {
  return runScheduledTasks();
}

/**
 * Get detailed scheduler info for debugging
 * @returns {Object} Detailed status
 */
function getSchedulerDebugInfo() {
  const triggers = ScriptApp.getProjectTriggers();

  return {
    status: getSchedulerStatus(),
    triggers: triggers.map(function(t) {
      return {
        id: t.getUniqueId(),
        handler: t.getHandlerFunction(),
        type: t.getEventType().toString()
      };
    }),
    revalidationQueue: getPreference('revalidation_queue', []),
    circuitBreaker: getCircuitBreakerStatus(),
    errorStats: getErrorStats()
  };
}
