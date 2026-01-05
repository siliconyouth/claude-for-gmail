/**
 * Claude for Gmail - Main Entry Point
 *
 * This Google Apps Script integrates Claude AI with Gmail for intelligent
 * email assistance including summarization, reply drafting, and analysis.
 */

/**
 * Process unread emails and add AI-generated summaries
 * Can be set up as a time-driven trigger
 */
function processUnreadEmails() {
  const messages = getUnreadEmails(CONFIG.MAX_EMAILS_PER_RUN);

  Logger.log(`Processing ${messages.length} unread emails`);

  messages.forEach(function(message) {
    try {
      const metadata = getEmailMetadata(message);
      const body = getEmailBody(message);

      Logger.log(`Processing: ${metadata.subject}`);

      // Analyze the email
      const analysis = analyzeEmail(body);

      // Add priority label
      addLabelToMessage(message, `AI/${analysis.priority}-priority`);

      Logger.log(`Analyzed: ${metadata.subject} - ${analysis.priority} priority, ${analysis.sentiment} sentiment`);

    } catch (error) {
      Logger.log(`Error processing email: ${error.message}`);
    }
  });

  Logger.log('Email processing complete');
}

/**
 * Summarize a specific email by message ID
 * @param {string} messageId - The Gmail message ID
 * @returns {string} The summary
 */
function summarizeEmailById(messageId) {
  const message = GmailApp.getMessageById(messageId);

  if (!message) {
    throw new Error('Message not found: ' + messageId);
  }

  const body = getEmailBody(message);
  return summarizeEmail(body);
}

/**
 * Generate a reply draft for a specific email
 * @param {string} messageId - The Gmail message ID
 * @param {string} instructions - Optional instructions for the reply
 * @returns {string} The draft ID
 */
function createReplyDraftById(messageId, instructions) {
  const message = GmailApp.getMessageById(messageId);

  if (!message) {
    throw new Error('Message not found: ' + messageId);
  }

  const body = getEmailBody(message);
  const replyText = generateReply(body, instructions);
  const draft = createReplyDraft(message, replyText);

  return draft.getId();
}

/**
 * Test function to verify Claude API connection
 */
function testClaudeConnection() {
  try {
    const response = askClaude('Say "Hello from Claude!" in exactly those words.');
    Logger.log('Claude response: ' + response);
    return response.includes('Hello from Claude');
  } catch (error) {
    Logger.log('Connection test failed: ' + error.message);
    return false;
  }
}

/**
 * Set up time-driven trigger to process emails periodically
 * Run this function once to create the trigger
 */
function setupTrigger() {
  // Remove existing triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'processUnreadEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger - runs every hour
  ScriptApp.newTrigger('processUnreadEmails')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('Trigger set up to run every hour');
}

/**
 * Remove the time-driven trigger
 */
function removeTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'processUnreadEmails') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('Trigger removed');
    }
  });
}

/**
 * Clear cached analysis for a specific message (for testing)
 * Run with message ID to clear its cache
 */
function clearCacheForMessage() {
  // Change this to the message ID you want to clear
  const messageId = 'msg-f:1853401742307403005';

  clearMessageCache(messageId);
  Logger.log('Cache cleared for: ' + messageId);
}

/**
 * Menu handler for Google Sheets/Docs add-on (if used)
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Claude for Gmail')
    .addItem('Process Unread Emails', 'processUnreadEmails')
    .addItem('Test Connection', 'testClaudeConnection')
    .addSeparator()
    .addItem('Set Up Hourly Trigger', 'setupTrigger')
    .addItem('Remove Trigger', 'removeTrigger')
    .addToUi();
}
