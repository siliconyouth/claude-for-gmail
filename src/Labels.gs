/**
 * Smart Auto-Labeling System
 * Automatically categorizes emails using Claude AI
 */

// Gmail label color constants
// Using black background (#000000) with white text (#ffffff) for all AI labels
const AI_LABEL_BACKGROUND = '#000000';
const AI_LABEL_TEXT = '#ffffff';

// Default label categories - all with black/white theme
const LABEL_CATEGORIES = {
  'AI/Priority/High': { description: 'Urgent or time-sensitive' },
  'AI/Priority/Medium': { description: 'Normal priority' },
  'AI/Priority/Low': { description: 'Low priority or FYI' },
  'AI/Category/Meeting': { description: 'Meeting requests and calendar' },
  'AI/Category/Request': { description: 'Action required from you' },
  'AI/Category/Info': { description: 'Informational, no action needed' },
  'AI/Category/Sales': { description: 'Sales and marketing emails' },
  'AI/Category/Support': { description: 'Support and help requests' },
  'AI/Category/Newsletter': { description: 'Newsletters and subscriptions' },
  'AI/Category/Personal': { description: 'Personal correspondence' },
  'AI/Category/Finance': { description: 'Financial and billing' },
  'AI/Status/NeedsReply': { description: 'Waiting for your response' },
  'AI/Status/WaitingOn': { description: 'Waiting on someone else' },
  'AI/Status/FYI': { description: 'No action required' }
};

/**
 * Initialize all AI labels in Gmail
 * Run once to create the label structure
 */
function initializeLabels() {
  Object.keys(LABEL_CATEGORIES).forEach(function(labelName) {
    getOrCreateLabel(labelName);
  });

  Logger.log('AI labels initialized');
}

/**
 * Get or create a Gmail label with black/white styling
 * Uses Gmail Advanced Service for color support
 * @param {string} labelName - Full label name (e.g., "AI/Category/Meeting")
 * @returns {GmailLabel} The Gmail label
 */
function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);

  if (!label) {
    // Create label using standard API first
    label = GmailApp.createLabel(labelName);
    Logger.log('Created label: ' + labelName);

    // Now update the color using Gmail Advanced Service
    try {
      setLabelColor(labelName);
    } catch (e) {
      Logger.log('Could not set label color: ' + e.message);
    }
  }

  return label;
}

/**
 * Set label color to black background with white text
 * Uses Gmail Advanced Service
 * @param {string} labelName - The label name
 */
function setLabelColor(labelName) {
  // Get all labels to find the ID
  const labels = Gmail.Users.Labels.list('me').labels;
  const targetLabel = labels.find(function(l) {
    return l.name === labelName;
  });

  if (!targetLabel) {
    Logger.log('Label not found: ' + labelName);
    return;
  }

  // Update label with color
  // Gmail uses a specific color palette, closest to black is #000000
  const labelUpdate = {
    color: {
      backgroundColor: AI_LABEL_BACKGROUND,
      textColor: AI_LABEL_TEXT
    }
  };

  Gmail.Users.Labels.update(labelUpdate, 'me', targetLabel.id);
  Logger.log('Set color for label: ' + labelName);
}

/**
 * Update all existing AI labels to black/white theme
 * Run this once to update existing labels
 */
function updateAllLabelColors() {
  Object.keys(LABEL_CATEGORIES).forEach(function(labelName) {
    try {
      const label = GmailApp.getUserLabelByName(labelName);
      if (label) {
        setLabelColor(labelName);
      }
    } catch (e) {
      Logger.log('Error updating ' + labelName + ': ' + e.message);
    }
  });
  Logger.log('All AI label colors updated to black/white theme');
}

/**
 * Categorize an email and return appropriate labels
 * @param {string} emailBody - The email content
 * @returns {Object} Categorization result with labels array
 */
function categorizeEmail(emailBody) {
  const systemPrompt = `You are an email categorization assistant. Analyze emails and return JSON with:
- priority: "high", "medium", or "low"
- category: one of "meeting", "request", "info", "sales", "support", "newsletter", "personal", "finance"
- status: one of "needs_reply", "waiting_on", "fyi"
- confidence: 0-100 confidence score

Rules:
- "high" priority: deadlines within 24-48 hours, urgent keywords, executive communication
- "meeting" category: calendar invites, scheduling requests, meeting notes
- "request" category: someone asking you to do something specific
- "needs_reply" status: direct questions, requests awaiting your response
- "waiting_on" status: you're waiting for someone else's action
- "fyi" status: informational only, no action needed

Respond ONLY with valid JSON, no other text.`;

  const prompt = `Categorize this email:\n\n${emailBody}`;

  const response = askClaude(prompt, systemPrompt);

  try {
    return JSON.parse(response);
  } catch (e) {
    Logger.log('Failed to parse categorization: ' + response);
    return {
      priority: 'medium',
      category: 'info',
      status: 'fyi',
      confidence: 50
    };
  }
}

/**
 * Apply smart labels to a message based on AI analysis
 * @param {GmailMessage} message - The Gmail message
 * @param {boolean} removeExisting - Whether to remove existing AI labels first
 * @returns {Object} Applied labels info
 */
function applySmartLabels(message, removeExisting) {
  const body = getEmailBody(message);
  const categorization = categorizeEmail(body);

  if (removeExisting) {
    removeAILabels(message);
  }

  const appliedLabels = [];

  // Apply priority label
  const priorityLabel = `AI/Priority/${capitalize(categorization.priority)}`;
  addLabelToMessage(message, priorityLabel);
  appliedLabels.push(priorityLabel);

  // Apply category label
  const categoryLabel = `AI/Category/${capitalize(categorization.category)}`;
  addLabelToMessage(message, categoryLabel);
  appliedLabels.push(categoryLabel);

  // Apply status label
  const statusMap = {
    'needs_reply': 'NeedsReply',
    'waiting_on': 'WaitingOn',
    'fyi': 'FYI'
  };
  const statusLabel = `AI/Status/${statusMap[categorization.status] || 'FYI'}`;
  addLabelToMessage(message, statusLabel);
  appliedLabels.push(statusLabel);

  return {
    categorization: categorization,
    labels: appliedLabels
  };
}

/**
 * Remove all AI labels from a message
 * @param {GmailMessage} message - The Gmail message
 */
function removeAILabels(message) {
  const thread = message.getThread();
  const labels = thread.getLabels();

  labels.forEach(function(label) {
    if (label.getName().startsWith('AI/')) {
      thread.removeLabel(label);
    }
  });
}

/**
 * Process and label all unread emails
 * Can be set up as a time-driven trigger
 */
function autoLabelUnreadEmails() {
  const messages = getUnreadEmails(CONFIG.MAX_EMAILS_PER_RUN);

  Logger.log(`Auto-labeling ${messages.length} unread emails`);

  let processed = 0;
  let errors = 0;

  messages.forEach(function(message) {
    try {
      const result = applySmartLabels(message, true);
      Logger.log(`Labeled: ${message.getSubject()} -> ${result.labels.join(', ')}`);
      processed++;
    } catch (error) {
      Logger.log(`Error labeling email: ${error.message}`);
      errors++;
    }
  });

  Logger.log(`Auto-labeling complete: ${processed} processed, ${errors} errors`);

  return { processed: processed, errors: errors };
}

/**
 * Set up auto-labeling trigger (runs every hour)
 */
function setupAutoLabelTrigger() {
  // First clean up ALL existing auto-label triggers
  removeAutoLabelTrigger();

  // Check if trigger already exists (safety check)
  const existingTriggers = ScriptApp.getProjectTriggers();
  const alreadyExists = existingTriggers.some(function(trigger) {
    return trigger.getHandlerFunction() === 'autoLabelUnreadEmails';
  });

  if (alreadyExists) {
    Logger.log('Auto-label trigger already exists, skipping creation');
    return;
  }

  // Create new trigger (minimum 1 hour for add-ons)
  ScriptApp.newTrigger('autoLabelUnreadEmails')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('Auto-label trigger set up for every hour');
}

/**
 * Remove auto-labeling trigger
 */
function removeAutoLabelTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'autoLabelUnreadEmails') {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    }
  });
  if (removed > 0) {
    Logger.log('Removed ' + removed + ' auto-label trigger(s)');
  }
}

/**
 * Clean up ALL triggers - run this manually if you get "too many triggers" error
 * Go to Apps Script editor and run this function
 */
function cleanupAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log('Found ' + triggers.length + ' total triggers');

  triggers.forEach(function(trigger) {
    Logger.log('Removing trigger: ' + trigger.getHandlerFunction());
    ScriptApp.deleteTrigger(trigger);
  });

  Logger.log('All triggers removed. You can now re-enable auto-labeling.');
}

/**
 * Get label statistics for the inbox
 * @returns {Object} Statistics by label
 */
function getLabelStats() {
  const stats = {};

  Object.keys(LABEL_CATEGORIES).forEach(function(labelName) {
    const label = GmailApp.getUserLabelByName(labelName);
    if (label) {
      const threads = label.getThreads(0, 100);
      stats[labelName] = {
        count: threads.length,
        description: LABEL_CATEGORIES[labelName].description
      };
    }
  });

  return stats;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Capitalize first letter of a string
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
