/**
 * Smart Auto-Labeling System
 * Automatically categorizes emails using Claude AI
 */

// Default label categories
const LABEL_CATEGORIES = {
  'AI/Priority/High': { color: '#cc3a21', description: 'Urgent or time-sensitive' },
  'AI/Priority/Medium': { color: '#f2a600', description: 'Normal priority' },
  'AI/Priority/Low': { color: '#149e60', description: 'Low priority or FYI' },
  'AI/Category/Meeting': { color: '#4986e7', description: 'Meeting requests and calendar' },
  'AI/Category/Request': { color: '#a479e2', description: 'Action required from you' },
  'AI/Category/Info': { color: '#98d7e4', description: 'Informational, no action needed' },
  'AI/Category/Sales': { color: '#ff7537', description: 'Sales and marketing emails' },
  'AI/Category/Support': { color: '#ffad47', description: 'Support and help requests' },
  'AI/Category/Newsletter': { color: '#b3dc6c', description: 'Newsletters and subscriptions' },
  'AI/Category/Personal': { color: '#f691b3', description: 'Personal correspondence' },
  'AI/Category/Finance': { color: '#16a766', description: 'Financial and billing' },
  'AI/Status/NeedsReply': { color: '#fb4c2f', description: 'Waiting for your response' },
  'AI/Status/WaitingOn': { color: '#ffc8af', description: 'Waiting on someone else' },
  'AI/Status/FYI': { color: '#c9daf8', description: 'No action required' }
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
 * Get or create a Gmail label
 * @param {string} labelName - Full label name (e.g., "AI/Category/Meeting")
 * @returns {GmailLabel} The Gmail label
 */
function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);

  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log('Created label: ' + labelName);
  }

  return label;
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
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'autoLabelUnreadEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

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
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'autoLabelUnreadEmails') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('Auto-label trigger removed');
    }
  });
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
