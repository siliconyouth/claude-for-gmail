/**
 * Gmail-specific utilities and operations
 */

/**
 * Get the body text from a Gmail message
 * @param {GmailMessage} message - The Gmail message object
 * @returns {string} The plain text body of the email
 */
function getEmailBody(message) {
  let body = message.getPlainBody();

  // Truncate if too long
  if (body.length > CONFIG.MAX_EMAIL_LENGTH) {
    body = body.substring(0, CONFIG.MAX_EMAIL_LENGTH) + '\n\n[Email truncated due to length]';
  }

  return body;
}

/**
 * Get recent unread emails from inbox
 * @param {number} maxResults - Maximum number of emails to return
 * @returns {GmailMessage[]} Array of Gmail messages
 */
function getUnreadEmails(maxResults) {
  maxResults = maxResults || CONFIG.MAX_EMAILS_PER_RUN;

  const threads = GmailApp.search('is:unread in:inbox', 0, maxResults);
  const messages = [];

  threads.forEach(function(thread) {
    const threadMessages = thread.getMessages();
    // Get the most recent message in each thread
    messages.push(threadMessages[threadMessages.length - 1]);
  });

  return messages;
}

/**
 * Create a draft reply to an email
 * @param {GmailMessage} message - The original message to reply to
 * @param {string} replyBody - The reply content
 * @returns {GmailDraft} The created draft
 */
function createReplyDraft(message, replyBody) {
  const thread = message.getThread();
  return thread.createDraftReply(replyBody);
}

/**
 * Add a label to a message's thread
 * @param {GmailMessage} message - The message
 * @param {string} labelName - The label name to add
 */
function addLabelToMessage(message, labelName) {
  let label = GmailApp.getUserLabelByName(labelName);

  if (!label) {
    label = GmailApp.createLabel(labelName);
  }

  message.getThread().addLabel(label);
}

/**
 * Get email metadata in a structured format
 * @param {GmailMessage} message - The Gmail message
 * @returns {Object} Structured email metadata
 */
function getEmailMetadata(message) {
  return {
    id: message.getId(),
    subject: message.getSubject(),
    from: message.getFrom(),
    to: message.getTo(),
    date: message.getDate(),
    isUnread: message.isUnread(),
    threadId: message.getThread().getId()
  };
}
