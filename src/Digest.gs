/**
 * Daily Digest Email Feature
 * Sends a morning summary of important unread emails
 */

/**
 * Generate and send daily digest email
 * Set up with setupDigestTrigger() to run automatically
 */
function sendDailyDigest() {
  const emails = getDigestEmails();

  if (emails.length === 0) {
    Logger.log('No emails for digest');
    return;
  }

  const digest = generateDigestContent(emails);
  sendDigestEmail(digest);

  Logger.log(`Digest sent with ${emails.length} emails`);
}

/**
 * Get emails for the digest (all unread since last digest)
 * Optimized: limits to 10 emails, uses caching, has timeout protection
 * @returns {Object[]} Array of email objects with metadata and analysis
 */
function getDigestEmails() {
  // Get emails since last digest, or last 7 days if first digest
  const lastDigest = getLastDigestTimestamp();
  let searchAfter;

  if (lastDigest) {
    searchAfter = lastDigest;
    Logger.log('Digest: searching for emails since ' + lastDigest.toISOString());
  } else {
    // First digest - get last 7 days
    searchAfter = new Date();
    searchAfter.setDate(searchAfter.getDate() - 7);
    Logger.log('Digest: first run, searching last 7 days');
  }

  // Search for unread emails since last digest (limit to 10 for performance)
  const query = `is:unread after:${formatDateForSearch(searchAfter)}`;
  const threads = GmailApp.search(query, 0, 10);

  Logger.log('Digest: found ' + threads.length + ' unread threads');

  const emails = [];
  const startTime = Date.now();
  const MAX_TIME = 4 * 60 * 1000; // 4 minutes max (leave buffer for sending)

  for (let i = 0; i < threads.length; i++) {
    // Check if we're running out of time
    if (Date.now() - startTime > MAX_TIME) {
      Logger.log('Digest timeout protection: processed ' + emails.length + ' emails');
      break;
    }

    const thread = threads[i];
    const messages = thread.getMessages();
    const latestMessage = messages[messages.length - 1];

    try {
      const messageId = latestMessage.getId();
      const body = getEmailBody(latestMessage);
      const metadata = getEmailMetadata(latestMessage);

      // Use cached analysis if available, otherwise analyze
      const analysis = analyzeEmail(body, messageId);

      emails.push({
        metadata: metadata,
        analysis: analysis,
        threadLength: messages.length
      });

      Logger.log('Digest: processed ' + (i + 1) + '/' + threads.length);
    } catch (error) {
      Logger.log('Error analyzing email for digest: ' + error.message);
    }
  }

  // Sort by priority (high first)
  emails.sort(function(a, b) {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.analysis.priority] || 2) - (priorityOrder[b.analysis.priority] || 2);
  });

  return emails;
}

/**
 * Generate HTML content for the digest email
 * @param {Object[]} emails - Array of email objects
 * @returns {Object} Digest content with subject and body
 */
function generateDigestContent(emails) {
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'EEEE, MMMM d');

  // Group by priority
  const highPriority = emails.filter(e => e.analysis.priority === 'high');
  const mediumPriority = emails.filter(e => e.analysis.priority === 'medium');
  const lowPriority = emails.filter(e => e.analysis.priority === 'low');

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }
    h2 { color: #202124; margin-top: 24px; }
    .email-item { background: #f8f9fa; padding: 12px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #dadce0; }
    .email-item.high { border-left-color: #ea4335; }
    .email-item.medium { border-left-color: #fbbc04; }
    .email-item.low { border-left-color: #34a853; }
    .from { font-weight: bold; color: #202124; }
    .subject { color: #5f6368; margin: 4px 0; }
    .summary { color: #202124; font-size: 14px; }
    .meta { color: #5f6368; font-size: 12px; margin-top: 8px; }
    .stats { background: #e8f0fe; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
    .priority-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .priority-high { background: #fce8e6; color: #c5221f; }
    .priority-medium { background: #fef7e0; color: #e37400; }
    .priority-low { background: #e6f4ea; color: #137333; }
    .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; }
    .dot-red { background: #ea4335; }
    .dot-yellow { background: #fbbc04; }
    .dot-green { background: #34a853; }
  </style>
</head>
<body>
  <h1>Your Daily Email Digest</h1>
  <p>${dateStr}</p>

  <div class="stats">
    <strong>${emails.length} unread emails</strong> |
    <span class="dot dot-red"></span>${highPriority.length} high priority |
    <span class="dot dot-yellow"></span>${mediumPriority.length} medium |
    <span class="dot dot-green"></span>${lowPriority.length} low
  </div>
`;

  // High priority section
  if (highPriority.length > 0) {
    html += '<h2><span class="dot dot-red"></span> High Priority</h2>';
    highPriority.forEach(function(email) {
      html += buildEmailItemHtml(email, 'high');
    });
  }

  // Medium priority section
  if (mediumPriority.length > 0) {
    html += '<h2><span class="dot dot-yellow"></span> Medium Priority</h2>';
    mediumPriority.forEach(function(email) {
      html += buildEmailItemHtml(email, 'medium');
    });
  }

  // Low priority section
  if (lowPriority.length > 0) {
    html += '<h2><span class="dot dot-green"></span> Low Priority</h2>';
    lowPriority.forEach(function(email) {
      html += buildEmailItemHtml(email, 'low');
    });
  }

  html += `
  <hr style="margin-top: 30px; border: none; border-top: 1px solid #dadce0;">
  <p style="color: #5f6368; font-size: 12px; text-align: center;">
    Generated by Claude for Gmail •
    <a href="https://mail.google.com">Open Gmail</a>
  </p>
</body>
</html>
`;

  return {
    subject: `Daily Digest: ${highPriority.length} high priority, ${emails.length} total (${dateStr})`,
    body: html
  };
}

/**
 * Build HTML for a single email item
 * @param {Object} email - Email object
 * @param {string} priority - Priority level
 * @returns {string} HTML string
 */
function buildEmailItemHtml(email, priority) {
  const fromName = extractName(email.metadata.from);
  const category = email.analysis.category || 'general';

  return `
    <div class="email-item ${priority}">
      <div class="from">${escapeHtml(fromName)}</div>
      <div class="subject">${escapeHtml(email.metadata.subject)}</div>
      <div class="summary">${escapeHtml(email.analysis.summary)}</div>
      <div class="meta">
        <span class="priority-badge priority-${priority}">${priority.toUpperCase()}</span>
        • ${category}
        ${email.threadLength > 1 ? '• ' + email.threadLength + ' messages in thread' : ''}
      </div>
    </div>
  `;
}

/**
 * Send the digest email to the current user
 * @param {Object} digest - Digest content with subject and body
 */
function sendDigestEmail(digest) {
  const userEmail = Session.getActiveUser().getEmail();

  GmailApp.sendEmail(userEmail, digest.subject, '', {
    htmlBody: digest.body,
    name: 'Claude for Gmail Digest'
  });
}

/**
 * Set up daily digest trigger (runs at 8 AM)
 */
function setupDigestTrigger() {
  // Remove existing digest triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'sendDailyDigest') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger at 8 AM
  ScriptApp.newTrigger('sendDailyDigest')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();

  Logger.log('Digest trigger set up for 8 AM daily');
}

/**
 * Remove daily digest trigger
 */
function removeDigestTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'sendDailyDigest') {
      ScriptApp.deleteTrigger(trigger);
      Logger.log('Digest trigger removed');
    }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format date for Gmail search query
 * @param {Date} date
 * @returns {string} Formatted date string (YYYY/MM/DD)
 */
function formatDateForSearch(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * Extract name from email address string
 * @param {string} from - From field (e.g., "John Doe <john@example.com>")
 * @returns {string} Extracted name or email
 */
function extractName(from) {
  if (!from) return 'Unknown';

  // Try to extract name from "Name <email>" format
  const match = from.match(/^([^<]+)</);
  if (match) {
    return match[1].trim();
  }

  // Return email without angle brackets
  return from.replace(/<|>/g, '').trim();
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
