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

// ============================================================================
// THREAD CONTEXT
// ============================================================================

/**
 * Get the full thread context for a message
 * @param {GmailMessage} message - The Gmail message
 * @param {number} maxMessages - Maximum messages to include (default: 5)
 * @returns {Object} Thread context with messages and metadata
 */
function getThreadContext(message, maxMessages) {
  maxMessages = maxMessages || 5;

  const thread = message.getThread();
  const allMessages = thread.getMessages();
  const currentMessageId = message.getId();

  // Get messages up to the current one (not including future messages)
  const relevantMessages = [];
  for (let i = 0; i < allMessages.length; i++) {
    relevantMessages.push(allMessages[i]);
    if (allMessages[i].getId() === currentMessageId) {
      break;
    }
  }

  // Take the last N messages
  const messagesToInclude = relevantMessages.slice(-maxMessages);

  // Build context
  const context = {
    threadSubject: thread.getFirstMessageSubject(),
    totalMessages: allMessages.length,
    includedMessages: messagesToInclude.length,
    messages: []
  };

  messagesToInclude.forEach(function(msg, index) {
    const isCurrentMessage = msg.getId() === currentMessageId;

    context.messages.push({
      index: index + 1,
      from: msg.getFrom(),
      date: msg.getDate(),
      isCurrent: isCurrentMessage,
      body: getEmailBody(msg)
    });
  });

  return context;
}

/**
 * Format thread context for Claude prompt
 * @param {Object} threadContext - Thread context object
 * @returns {string} Formatted context string
 */
function formatThreadContextForPrompt(threadContext) {
  if (threadContext.messages.length <= 1) {
    return ''; // No thread context needed for single message
  }

  let contextStr = `\n\n--- THREAD CONTEXT (${threadContext.includedMessages} of ${threadContext.totalMessages} messages) ---\n`;
  contextStr += `Subject: ${threadContext.threadSubject}\n\n`;

  threadContext.messages.forEach(function(msg) {
    const marker = msg.isCurrent ? '[CURRENT MESSAGE]' : `[Message ${msg.index}]`;
    const dateStr = Utilities.formatDate(msg.date, Session.getScriptTimeZone(), 'MMM d, h:mm a');

    contextStr += `${marker}\n`;
    contextStr += `From: ${msg.from}\n`;
    contextStr += `Date: ${dateStr}\n`;
    contextStr += `${msg.body}\n`;
    contextStr += '\n---\n\n';
  });

  return contextStr;
}

/**
 * Get email body with thread context included
 * @param {GmailMessage} message - The Gmail message
 * @param {boolean} includeContext - Whether to include thread context
 * @returns {string} Email body with optional context
 */
function getEmailBodyWithContext(message, includeContext) {
  const body = getEmailBody(message);

  if (!includeContext) {
    return body;
  }

  const threadContext = getThreadContext(message);

  // Only include context if there's a thread
  if (threadContext.totalMessages > 1) {
    return formatThreadContextForPrompt(threadContext) + '\n\n--- CURRENT EMAIL ---\n' + body;
  }

  return body;
}
