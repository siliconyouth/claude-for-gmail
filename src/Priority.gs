/**
 * Priority Inbox
 * AI-sorted email dashboard showing what matters most
 */

/**
 * Get priority inbox view - AI-sorted emails
 * @param {number} maxEmails - Maximum emails to analyze
 * @returns {Object} Priority inbox data
 */
function getPriorityInbox(maxEmails) {
  maxEmails = maxEmails || 20;

  // Check cache (refresh every 30 minutes)
  const cacheKey = 'priority_inbox_' + Session.getActiveUser().getEmail();
  const cached = getCached(cacheKey);
  if (cached && cached.generatedAt) {
    const cacheAge = Date.now() - new Date(cached.generatedAt).getTime();
    if (cacheAge < 30 * 60 * 1000) {
      return cached;
    }
  }

  try {
    // Get unread emails from inbox
    const threads = GmailApp.getInboxThreads(0, maxEmails);
    const emails = [];

    threads.forEach(function(thread) {
      const messages = thread.getMessages();
      const lastMessage = messages[messages.length - 1];

      if (!lastMessage.isInTrash()) {
        emails.push({
          threadId: thread.getId(),
          messageId: lastMessage.getId(),
          subject: thread.getFirstMessageSubject(),
          from: lastMessage.getFrom(),
          date: lastMessage.getDate(),
          isUnread: thread.isUnread(),
          snippet: lastMessage.getPlainBody().substring(0, 200),
          hasAttachment: lastMessage.getAttachments().length > 0,
          messageCount: messages.length
        });
      }
    });

    // Batch analyze with Claude for priority scoring
    const prioritized = prioritizeEmails(emails);

    const result = {
      generatedAt: new Date().toISOString(),
      totalEmails: emails.length,
      sections: {
        urgent: prioritized.filter(function(e) { return e.priority === 'urgent'; }),
        important: prioritized.filter(function(e) { return e.priority === 'important'; }),
        normal: prioritized.filter(function(e) { return e.priority === 'normal'; }),
        lowPriority: prioritized.filter(function(e) { return e.priority === 'low'; })
      },
      stats: {
        urgent: prioritized.filter(function(e) { return e.priority === 'urgent'; }).length,
        important: prioritized.filter(function(e) { return e.priority === 'important'; }).length,
        normal: prioritized.filter(function(e) { return e.priority === 'normal'; }).length,
        low: prioritized.filter(function(e) { return e.priority === 'low'; }).length
      }
    };

    // Cache for 30 minutes
    setCached(cacheKey, result, 1800);

    // Track analytics
    trackFeatureUsage('priority_inbox');

    return result;

  } catch (error) {
    Logger.log('Priority inbox error: ' + error.message);
    return {
      error: error.message,
      sections: { urgent: [], important: [], normal: [], lowPriority: [] },
      stats: { urgent: 0, important: 0, normal: 0, low: 0 }
    };
  }
}

/**
 * Prioritize a batch of emails using Claude
 * @param {Array} emails - Array of email objects
 * @returns {Array} Emails with priority scores
 */
function prioritizeEmails(emails) {
  if (emails.length === 0) return [];

  // Create summary for Claude
  const emailSummaries = emails.map(function(e, i) {
    return `${i}: From: ${extractSenderName(e.from)} | Subject: ${e.subject} | ${e.isUnread ? 'UNREAD' : 'read'} | ${e.hasAttachment ? 'Has attachment' : ''}`;
  }).join('\n');

  try {
    const systemPrompt = `You are an email priority assistant. Analyze these emails and assign priority.

Priority levels:
- "urgent": Time-sensitive, requires immediate action, from important contacts, has deadlines
- "important": Needs attention soon, meaningful content, action required
- "normal": Regular correspondence, can be handled during normal workflow
- "low": Newsletters, automated emails, FYI only, can wait

Consider:
- Sender (executives, clients, team members = higher priority)
- Keywords (urgent, deadline, ASAP, required, important)
- Whether it's unread
- Subject line tone and content

Return JSON with:
- priorities: array of objects with {index: number, priority: string, reason: string}

Respond ONLY with valid JSON.`;

    const prompt = `Prioritize these emails:\n\n${emailSummaries}`;

    const response = askClaude(prompt, systemPrompt);
    const result = parseClaudeJson(response);

    // Map priorities back to emails
    const priorityMap = {};
    (result.priorities || []).forEach(function(p) {
      priorityMap[p.index] = { priority: p.priority, reason: p.reason };
    });

    return emails.map(function(email, index) {
      const p = priorityMap[index] || { priority: 'normal', reason: 'Default' };
      email.priority = p.priority;
      email.priorityReason = p.reason;
      return email;
    });

  } catch (error) {
    Logger.log('Prioritization error: ' + error.message);

    // Fallback: basic heuristic prioritization
    return emails.map(function(email) {
      email.priority = heuristicPriority(email);
      email.priorityReason = 'Heuristic';
      return email;
    });
  }
}

/**
 * Basic heuristic priority (fallback)
 * @param {Object} email - Email object
 * @returns {string} Priority level
 */
function heuristicPriority(email) {
  const subject = email.subject.toLowerCase();
  const from = email.from.toLowerCase();

  // Urgent keywords
  if (subject.match(/urgent|asap|immediately|critical|emergency/)) {
    return 'urgent';
  }

  // Important keywords
  if (subject.match(/important|deadline|required|action needed|please review/)) {
    return 'important';
  }

  // Low priority signals
  if (subject.match(/newsletter|unsubscribe|notification|automated|no-?reply/)) {
    return 'low';
  }

  if (from.match(/no-?reply|newsletter|notifications?@|marketing@/)) {
    return 'low';
  }

  // Unread = slightly higher priority
  if (email.isUnread) {
    return 'normal';
  }

  return 'normal';
}

/**
 * Extract sender name from email address
 * @param {string} from - From field
 * @returns {string} Name or email
 */
function extractSenderName(from) {
  const nameMatch = from.match(/^([^<]+)</);
  if (nameMatch) {
    return nameMatch[1].trim().replace(/"/g, '');
  }
  return from.split('@')[0];
}

/**
 * Get priority inbox summary for display
 * @returns {Object} Summary stats
 */
function getPriorityInboxSummary() {
  const inbox = getPriorityInbox(20);

  return {
    urgent: inbox.stats.urgent,
    important: inbox.stats.important,
    total: inbox.totalEmails,
    lastUpdated: inbox.generatedAt,
    needsAttention: inbox.stats.urgent + inbox.stats.important
  };
}

/**
 * Refresh priority inbox (force cache update)
 * @returns {Object} Fresh priority inbox
 */
function refreshPriorityInbox() {
  const cacheKey = 'priority_inbox_' + Session.getActiveUser().getEmail();

  // Clear cache
  const cache = CacheService.getUserCache();
  cache.remove(cacheKey);

  // Get fresh data
  return getPriorityInbox(20);
}

/**
 * Get emails needing attention (urgent + important)
 * @returns {Array} Emails requiring attention
 */
function getEmailsNeedingAttention() {
  const inbox = getPriorityInbox(20);

  return inbox.sections.urgent.concat(inbox.sections.important);
}

/**
 * Mark email as handled in priority view
 * @param {string} messageId - Message ID
 */
function markAsHandled(messageId) {
  // This would update a "handled" list to exclude from priority view
  // Implementation depends on desired behavior

  const handled = getPreference('priority_handled', []);
  if (handled.indexOf(messageId) === -1) {
    handled.push(messageId);
    // Keep only last 100
    if (handled.length > 100) {
      handled.shift();
    }
    setPreference('priority_handled', handled);
  }
}
