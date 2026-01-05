/**
 * Email Security - Spam, Scam & Phishing Detection
 * Uses Claude AI to analyze emails for security threats
 */

// Security threat levels
const THREAT_LEVEL = {
  SAFE: 'safe',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Security labels
const SECURITY_LABEL_SUSPICIOUS = 'Claude/Suspicious';
const SECURITY_LABEL_PHISHING = 'Claude/Phishing';
const SECURITY_LABEL_SCAM = 'Claude/Scam';
const SECURITY_LABEL_SPAM = 'Claude/Spam';

// Cache keys
const SECURITY_SCAN_CACHE_KEY = 'security_scan_cache';
const SECURITY_CACHE_EXPIRY_DAYS = 7; // Cache results for 7 days

/**
 * Analyze an email for security threats
 * @param {GmailMessage} message - The Gmail message to analyze
 * @returns {Object} Security analysis result
 */
function analyzeEmailSecurity(message) {
  const subject = message.getSubject();
  const from = message.getFrom();
  const body = getEmailBody(message);
  const replyTo = message.getReplyTo();

  // Get headers for deeper analysis
  const headers = extractSecurityHeaders(message);

  const systemPrompt = `You are an email security expert analyzing emails for spam, scams, and phishing attempts.

Analyze the email and provide a security assessment. Look for:

PHISHING INDICATORS:
- Urgency tactics ("Act now!", "Account suspended")
- Requests for credentials, passwords, SSN, credit cards
- Suspicious links (hover text vs actual URL mismatch)
- Impersonation of known brands/companies
- Generic greetings ("Dear Customer" vs your name)
- Grammar/spelling errors from "official" sources
- Mismatched sender domain (e.g., paypa1.com vs paypal.com)

SCAM INDICATORS:
- Too good to be true offers (lottery wins, inheritance)
- Requests for money or gift cards
- Fake job offers requiring payment
- Romance scam patterns
- Tech support scams
- Investment/crypto scams

SPAM INDICATORS:
- Unsolicited commercial content
- Suspicious unsubscribe mechanisms
- Bulk sender patterns
- Promotional content from unknown sources

Return a JSON response with:
{
  "threatLevel": "safe|low|medium|high|critical",
  "threatType": "none|spam|scam|phishing|malware",
  "confidence": 0-100,
  "summary": "Brief 1-2 sentence summary",
  "indicators": ["list", "of", "specific", "red", "flags"],
  "recommendations": ["what", "user", "should", "do"],
  "senderTrust": "trusted|unknown|suspicious|malicious",
  "linkAnalysis": {
    "suspiciousLinks": ["any suspicious URLs found"],
    "safeLinks": ["legitimate URLs"]
  }
}

Be thorough but avoid false positives. Legitimate marketing emails should be "low" threat at most.
Respond ONLY with valid JSON.`;

  const prompt = `Analyze this email for security threats:

FROM: ${from}
REPLY-TO: ${replyTo || 'same as from'}
SUBJECT: ${subject}

HEADERS:
${JSON.stringify(headers, null, 2)}

EMAIL BODY:
${body.substring(0, 8000)}`;

  try {
    const response = askClaude(prompt, systemPrompt);
    Logger.log('Security scan response: ' + response.substring(0, 500));

    // Use parseClaudeJson for robust JSON extraction
    const analysis = parseClaudeJson(response);

    // Add metadata
    analysis.analyzedAt = new Date().toISOString();
    analysis.messageId = message.getId();

    // Track usage
    trackFeatureUsage('security_scan');

    return analysis;

  } catch (error) {
    Logger.log('Security scan error: ' + error.message);
    logError('analyzeEmailSecurity', error);

    // Provide more helpful error info
    let errorSummary = 'Unable to complete security analysis';
    let recommendations = ['Review email manually'];

    if (error.message.includes('API key')) {
      errorSummary = 'API key not configured';
      recommendations = ['Set your Anthropic API key in Script Properties'];
    } else if (error.message.includes('circuit breaker')) {
      errorSummary = 'Too many API errors - temporarily paused';
      recommendations = ['Wait a few minutes and try again'];
    } else if (error.message.includes('JSON')) {
      errorSummary = 'Failed to parse AI response';
      recommendations = ['Try again or use Quick Security Check instead'];
    }

    return {
      threatLevel: THREAT_LEVEL.LOW,
      threatType: 'error',
      confidence: 0,
      summary: errorSummary + ': ' + error.message,
      indicators: [],
      recommendations: recommendations,
      error: error.message
    };
  }
}

/**
 * Extract security-relevant headers from message
 * @param {GmailMessage} message - Gmail message
 * @returns {Object} Extracted headers
 */
function extractSecurityHeaders(message) {
  try {
    const rawMessage = Gmail.Users.Messages.get('me', message.getId(), { format: 'metadata' });
    const headers = {};

    const securityHeaders = [
      'From', 'Reply-To', 'Return-Path', 'Received-SPF',
      'Authentication-Results', 'DKIM-Signature', 'X-Spam-Status',
      'X-Mailer', 'X-Originating-IP'
    ];

    if (rawMessage.payload && rawMessage.payload.headers) {
      rawMessage.payload.headers.forEach(function(header) {
        if (securityHeaders.includes(header.name)) {
          headers[header.name] = header.value;
        }
      });
    }

    return headers;
  } catch (e) {
    return { error: 'Could not extract headers' };
  }
}

/**
 * Quick security check (lighter weight than full analysis)
 * @param {GmailMessage} message - The message to check
 * @returns {Object} Quick check result
 */
function quickSecurityCheck(message) {
  const from = message.getFrom();
  const subject = message.getSubject().toLowerCase();
  const body = getEmailBody(message).toLowerCase();

  const redFlags = [];
  let riskScore = 0;

  // Check sender patterns
  const senderPatterns = [
    { pattern: /noreply@.*\.(ru|cn|tk)$/i, flag: 'Suspicious sender domain', score: 30 },
    { pattern: /@.*paypa[l1].*\.com/i, flag: 'Possible PayPal impersonation', score: 50 },
    { pattern: /@.*app[l1]e.*\.com/i, flag: 'Possible Apple impersonation', score: 50 },
    { pattern: /@.*amaz[o0]n.*\.com/i, flag: 'Possible Amazon impersonation', score: 50 },
    { pattern: /@.*g[o0][o0]g[l1]e.*\.com/i, flag: 'Possible Google impersonation', score: 50 },
    { pattern: /@.*micr[o0]s[o0]ft.*\.com/i, flag: 'Possible Microsoft impersonation', score: 50 }
  ];

  senderPatterns.forEach(function(p) {
    if (p.pattern.test(from)) {
      redFlags.push(p.flag);
      riskScore += p.score;
    }
  });

  // Check subject patterns
  const subjectPatterns = [
    { pattern: /urgent|immediate action|act now/i, flag: 'Urgency tactics in subject', score: 15 },
    { pattern: /account.*(suspend|verify|confirm)/i, flag: 'Account verification request', score: 25 },
    { pattern: /won|winner|lottery|prize/i, flag: 'Prize/lottery claim', score: 40 },
    { pattern: /password.*expire/i, flag: 'Password expiration warning', score: 30 },
    { pattern: /invoice|payment.*due/i, flag: 'Unsolicited invoice', score: 20 }
  ];

  subjectPatterns.forEach(function(p) {
    if (p.pattern.test(subject)) {
      redFlags.push(p.flag);
      riskScore += p.score;
    }
  });

  // Check body patterns
  const bodyPatterns = [
    { pattern: /click here immediately|click below to verify/i, flag: 'Urgent click request', score: 20 },
    { pattern: /social security|ssn|credit card number/i, flag: 'Requests sensitive info', score: 40 },
    { pattern: /bitcoin|cryptocurrency|wire transfer/i, flag: 'Crypto/wire payment request', score: 25 },
    { pattern: /gift card/i, flag: 'Gift card payment request', score: 35 },
    { pattern: /nigerian prince|inheritance|beneficiary/i, flag: 'Classic scam pattern', score: 50 },
    { pattern: /your account (has been|will be) (locked|suspended|closed)/i, flag: 'Account threat', score: 30 },
    { pattern: /verify your identity/i, flag: 'Identity verification request', score: 20 },
    { pattern: /dear (customer|user|member|valued)/i, flag: 'Generic greeting', score: 10 }
  ];

  bodyPatterns.forEach(function(p) {
    if (p.pattern.test(body)) {
      redFlags.push(p.flag);
      riskScore += p.score;
    }
  });

  // Determine threat level based on score
  let threatLevel = THREAT_LEVEL.SAFE;
  if (riskScore >= 80) threatLevel = THREAT_LEVEL.CRITICAL;
  else if (riskScore >= 50) threatLevel = THREAT_LEVEL.HIGH;
  else if (riskScore >= 30) threatLevel = THREAT_LEVEL.MEDIUM;
  else if (riskScore >= 10) threatLevel = THREAT_LEVEL.LOW;

  return {
    threatLevel: threatLevel,
    riskScore: riskScore,
    redFlags: redFlags,
    isQuickCheck: true
  };
}

/**
 * Report email as phishing to Google
 * @param {string} messageId - The message ID
 * @returns {Object} Result
 */
function reportAsPhishing(messageId) {
  try {
    const message = GmailApp.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const thread = message.getThread();

    // Add phishing label for tracking
    const label = getOrCreateLabel(SECURITY_LABEL_PHISHING);
    thread.addLabel(label);

    // Move thread to spam
    thread.moveToSpam();

    // Log the report
    logSecurityAction('report_phishing', messageId);
    trackFeatureUsage('report_phishing');

    return {
      success: true,
      action: 'Reported as phishing and moved to spam',
      messageId: messageId
    };

  } catch (error) {
    logError('reportAsPhishing', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Report email as spam to Google
 * @param {string} messageId - The message ID
 * @returns {Object} Result
 */
function reportAsSpam(messageId) {
  try {
    const message = GmailApp.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const thread = message.getThread();

    // Add spam label for tracking
    const label = getOrCreateLabel(SECURITY_LABEL_SPAM);
    thread.addLabel(label);

    // Move thread to spam
    thread.moveToSpam();

    // Log the report
    logSecurityAction('report_spam', messageId);
    trackFeatureUsage('report_spam');

    return {
      success: true,
      action: 'Reported as spam',
      messageId: messageId
    };

  } catch (error) {
    logError('reportAsSpam', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Archive suspicious email (remove from inbox but keep for reference)
 * @param {string} messageId - The message ID
 * @param {string} reason - Reason for archiving
 * @returns {Object} Result
 */
function archiveSuspiciousEmail(messageId, reason) {
  try {
    const message = GmailApp.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const thread = message.getThread();

    // Add suspicious label
    const label = getOrCreateLabel(SECURITY_LABEL_SUSPICIOUS);
    thread.addLabel(label);

    // Archive (remove from inbox)
    thread.moveToArchive();

    // Store metadata about why it was archived
    const archiveLog = getPreference('security_archive_log', []);
    archiveLog.push({
      messageId: messageId,
      reason: reason,
      archivedAt: new Date().toISOString()
    });
    // Keep only last 100 entries
    if (archiveLog.length > 100) {
      archiveLog.shift();
    }
    setPreference('security_archive_log', archiveLog);

    logSecurityAction('archive_suspicious', messageId, reason);
    trackFeatureUsage('archive_suspicious');

    return {
      success: true,
      action: 'Archived and labeled as suspicious',
      messageId: messageId
    };

  } catch (error) {
    logError('archiveSuspiciousEmail', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mark email as safe (whitelist sender)
 * @param {string} messageId - The message ID
 * @returns {Object} Result
 */
function markAsSafe(messageId) {
  try {
    const message = GmailApp.getMessageById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const from = message.getFrom();
    const emailMatch = from.match(/<([^>]+)>/) || [null, from];
    const email = emailMatch[1] || from;

    // Add to whitelist
    const whitelist = getPreference('security_whitelist', []);
    if (!whitelist.includes(email)) {
      whitelist.push(email);
      setPreference('security_whitelist', whitelist);
    }

    // Remove any security labels
    const thread = message.getThread();
    [SECURITY_LABEL_SUSPICIOUS, SECURITY_LABEL_PHISHING, SECURITY_LABEL_SCAM, SECURITY_LABEL_SPAM].forEach(function(labelName) {
      try {
        const label = GmailApp.getUserLabelByName(labelName);
        if (label) {
          thread.removeLabel(label);
        }
      } catch (e) {}
    });

    logSecurityAction('mark_safe', messageId, email);
    trackFeatureUsage('mark_safe');

    return {
      success: true,
      action: 'Marked as safe, sender whitelisted',
      email: email
    };

  } catch (error) {
    logError('markAsSafe', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check if sender is whitelisted
 * @param {string} email - Email address to check
 * @returns {boolean}
 */
function isSenderWhitelisted(email) {
  const whitelist = getPreference('security_whitelist', []);
  const cleanEmail = email.match(/<([^>]+)>/) ? email.match(/<([^>]+)>/)[1] : email;
  return whitelist.includes(cleanEmail.toLowerCase());
}

/**
 * Get security scan history
 * @param {number} limit - Number of records to return
 * @returns {Object[]} Scan history
 */
function getSecurityHistory(limit) {
  limit = limit || 20;
  const history = getPreference('security_action_log', []);
  return history.slice(-limit).reverse();
}

/**
 * Log a security action
 * @param {string} action - Action type
 * @param {string} messageId - Message ID
 * @param {string} details - Additional details
 */
function logSecurityAction(action, messageId, details) {
  const log = getPreference('security_action_log', []);
  log.push({
    action: action,
    messageId: messageId,
    details: details || '',
    timestamp: new Date().toISOString()
  });
  // Keep only last 200 entries
  if (log.length > 200) {
    log.shift();
  }
  setPreference('security_action_log', log);
}

/**
 * Get security statistics
 * @returns {Object} Security stats
 */
function getSecurityStats() {
  const history = getPreference('security_action_log', []);
  const whitelist = getPreference('security_whitelist', []);

  const stats = {
    totalScans: 0,
    phishingReported: 0,
    spamReported: 0,
    archived: 0,
    markedSafe: 0,
    whitelistedSenders: whitelist.length
  };

  history.forEach(function(entry) {
    switch (entry.action) {
      case 'security_scan':
        stats.totalScans++;
        break;
      case 'report_phishing':
        stats.phishingReported++;
        break;
      case 'report_spam':
        stats.spamReported++;
        break;
      case 'archive_suspicious':
        stats.archived++;
        break;
      case 'mark_safe':
        stats.markedSafe++;
        break;
    }
  });

  return stats;
}

// ============================================================================
// SECURITY SCAN CACHE
// ============================================================================

/**
 * Get the security scan cache
 * @returns {Object} Cache object with messageId keys
 */
function getSecurityScanCache() {
  const props = PropertiesService.getUserProperties();
  const cacheStr = props.getProperty(SECURITY_SCAN_CACHE_KEY);

  if (!cacheStr) {
    return { scanned: {}, threats: [], lastCleanup: Date.now() };
  }

  try {
    const cache = JSON.parse(cacheStr);
    // Clean up expired entries periodically (once per day)
    const oneDay = 24 * 60 * 60 * 1000;
    if (!cache.lastCleanup || Date.now() - cache.lastCleanup > oneDay) {
      return cleanupSecurityCache(cache);
    }
    return cache;
  } catch (e) {
    Logger.log('Error parsing security cache: ' + e.message);
    return { scanned: {}, threats: [], lastCleanup: Date.now() };
  }
}

/**
 * Save the security scan cache
 * @param {Object} cache - Cache object to save
 */
function saveSecurityScanCache(cache) {
  const props = PropertiesService.getUserProperties();
  try {
    // Limit cache size to avoid quota issues
    const cacheStr = JSON.stringify(cache);
    if (cacheStr.length > 50000) {
      // If too large, keep only recent threats and clear old scanned entries
      cache = cleanupSecurityCache(cache, true);
    }
    props.setProperty(SECURITY_SCAN_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    Logger.log('Error saving security cache: ' + e.message);
  }
}

/**
 * Clean up expired cache entries
 * @param {Object} cache - Cache object
 * @param {boolean} aggressive - If true, be more aggressive about cleanup
 * @returns {Object} Cleaned cache
 */
function cleanupSecurityCache(cache, aggressive) {
  const expiryTime = SECURITY_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const cutoff = now - expiryTime;

  // Clean up old scanned entries
  const newScanned = {};
  let count = 0;
  const maxEntries = aggressive ? 200 : 500;

  // Sort by timestamp descending and keep most recent
  const entries = Object.entries(cache.scanned || {})
    .filter(function(entry) { return entry[1].timestamp > cutoff; })
    .sort(function(a, b) { return b[1].timestamp - a[1].timestamp; });

  entries.forEach(function(entry) {
    if (count < maxEntries) {
      newScanned[entry[0]] = entry[1];
      count++;
    }
  });

  // Clean up old threats (keep threats longer)
  const threatCutoff = now - (expiryTime * 2); // Keep threats 2x longer
  const newThreats = (cache.threats || []).filter(function(threat) {
    return threat.timestamp > threatCutoff;
  });

  return {
    scanned: newScanned,
    threats: newThreats,
    lastCleanup: now
  };
}

/**
 * Clear the security scan cache
 */
function clearSecurityScanCache() {
  const props = PropertiesService.getUserProperties();
  props.deleteProperty(SECURITY_SCAN_CACHE_KEY);
  Logger.log('Security scan cache cleared');
}

/**
 * Batch scan recent emails for threats (with caching)
 * @param {number} count - Number of NEW emails to scan
 * @returns {Object} Batch scan results including cached threats
 */
function batchSecurityScan(count) {
  count = Math.min(count || 10, 50); // Cap at 50 for timeout safety

  // Load cache
  const cache = getSecurityScanCache();
  const scannedIds = cache.scanned || {};

  // Get more threads than requested to find unscanned ones
  const fetchCount = Math.min(count * 3, 150); // Fetch 3x to find new messages
  const threads = GmailApp.getInboxThreads(0, fetchCount);

  const results = {
    scanned: 0,
    newScanned: 0,
    fromCache: 0,
    threats: [],
    safe: 0,
    errors: 0,
    timedOut: false
  };

  const startTime = Date.now();
  const MAX_TIME = 5 * 60 * 1000; // 5 minutes max

  // First, add cached threats to results
  (cache.threats || []).forEach(function(threat) {
    // Check if the message still exists and is still in inbox
    try {
      const msg = GmailApp.getMessageById(threat.messageId);
      if (msg && msg.getThread().isInInbox()) {
        results.threats.push(threat);
        results.fromCache++;
      }
    } catch (e) {
      // Message no longer exists, skip it
    }
  });

  // Track new threats to add to cache
  const newThreats = [];

  for (let i = 0; i < threads.length; i++) {
    // Stop if we've scanned enough new messages
    if (results.newScanned >= count) {
      break;
    }

    // Timeout protection
    if (Date.now() - startTime > MAX_TIME) {
      Logger.log('Batch scan timeout: processed ' + results.newScanned + ' new messages');
      results.timedOut = true;
      break;
    }

    const thread = threads[i];
    try {
      const message = thread.getMessages()[0];
      const messageId = message.getId();
      const from = message.getFrom();

      // Check if already scanned (in cache)
      if (scannedIds[messageId]) {
        results.scanned++;
        // If it was a threat, it's already in results from cache
        if (scannedIds[messageId].safe) {
          results.safe++;
        }
        continue;
      }

      // Skip whitelisted senders
      if (isSenderWhitelisted(from)) {
        results.safe++;
        // Cache as safe
        scannedIds[messageId] = { safe: true, timestamp: Date.now() };
        continue;
      }

      // Run quick check (this is new work)
      const quickResult = quickSecurityCheck(message);
      results.scanned++;
      results.newScanned++;

      if (quickResult.threatLevel !== THREAT_LEVEL.SAFE) {
        const threat = {
          messageId: messageId,
          subject: message.getSubject(),
          from: from,
          threatLevel: quickResult.threatLevel,
          redFlags: quickResult.redFlags,
          timestamp: Date.now()
        };
        results.threats.push(threat);
        newThreats.push(threat);

        // Cache as threat
        scannedIds[messageId] = { safe: false, timestamp: Date.now() };
      } else {
        results.safe++;
        // Cache as safe
        scannedIds[messageId] = { safe: true, timestamp: Date.now() };
      }

    } catch (e) {
      results.errors++;
      Logger.log('Batch scan error: ' + e.message);
    }
  }

  // Update cache with new results
  cache.scanned = scannedIds;
  cache.threats = [...(cache.threats || []), ...newThreats];
  saveSecurityScanCache(cache);

  trackFeatureUsage('batch_security_scan');

  return results;
}

/**
 * Bulk archive all detected threats
 * @param {Object[]} threats - Array of threat objects from batchSecurityScan
 * @returns {Object} Results
 */
function bulkArchiveThreats(threats) {
  const results = {
    archived: 0,
    failed: 0,
    errors: []
  };

  threats.forEach(function(threat) {
    try {
      archiveSuspiciousEmail(threat.messageId, 'Bulk archive: ' + threat.threatLevel);
      results.archived++;
    } catch (e) {
      results.failed++;
      results.errors.push({ messageId: threat.messageId, error: e.message });
    }
  });

  trackFeatureUsage('bulk_archive');
  return results;
}

/**
 * Bulk report emails as spam
 * @param {string[]} messageIds - Array of message IDs
 * @returns {Object} Results
 */
function bulkReportSpam(messageIds) {
  const results = {
    reported: 0,
    failed: 0,
    errors: []
  };

  messageIds.forEach(function(messageId) {
    try {
      reportAsSpam(messageId);
      results.reported++;
    } catch (e) {
      results.failed++;
      results.errors.push({ messageId: messageId, error: e.message });
    }
  });

  trackFeatureUsage('bulk_report_spam');
  return results;
}

/**
 * Bulk apply label to emails
 * @param {string[]} messageIds - Array of message IDs
 * @param {string} labelName - Label to apply
 * @returns {Object} Results
 */
function bulkApplyLabel(messageIds, labelName) {
  const results = {
    labeled: 0,
    failed: 0,
    errors: []
  };

  const label = getOrCreateLabel(labelName);

  messageIds.forEach(function(messageId) {
    try {
      const message = GmailApp.getMessageById(messageId);
      if (message) {
        message.getThread().addLabel(label);
        results.labeled++;
      }
    } catch (e) {
      results.failed++;
      results.errors.push({ messageId: messageId, error: e.message });
    }
  });

  trackFeatureUsage('bulk_label');
  return results;
}

/**
 * Bulk archive emails
 * @param {string[]} messageIds - Array of message IDs
 * @returns {Object} Results
 */
function bulkArchive(messageIds) {
  const results = {
    archived: 0,
    failed: 0,
    errors: []
  };

  messageIds.forEach(function(messageId) {
    try {
      const message = GmailApp.getMessageById(messageId);
      if (message) {
        message.getThread().moveToArchive();
        results.archived++;
      }
    } catch (e) {
      results.failed++;
      results.errors.push({ messageId: messageId, error: e.message });
    }
  });

  trackFeatureUsage('bulk_archive');
  return results;
}

/**
 * Bulk delete emails (move to trash)
 * @param {string[]} messageIds - Array of message IDs
 * @returns {Object} Results
 */
function bulkTrash(messageIds) {
  const results = {
    trashed: 0,
    failed: 0,
    errors: []
  };

  messageIds.forEach(function(messageId) {
    try {
      const message = GmailApp.getMessageById(messageId);
      if (message) {
        message.getThread().moveToTrash();
        results.trashed++;
      }
    } catch (e) {
      results.failed++;
      results.errors.push({ messageId: messageId, error: e.message });
    }
  });

  trackFeatureUsage('bulk_trash');
  return results;
}

/**
 * Bulk mark as read
 * @param {string[]} messageIds - Array of message IDs
 * @returns {Object} Results
 */
function bulkMarkRead(messageIds) {
  const results = {
    marked: 0,
    failed: 0
  };

  messageIds.forEach(function(messageId) {
    try {
      const message = GmailApp.getMessageById(messageId);
      if (message) {
        message.getThread().markRead();
        results.marked++;
      }
    } catch (e) {
      results.failed++;
    }
  });

  trackFeatureUsage('bulk_mark_read');
  return results;
}

/**
 * Bulk mark as unread
 * @param {string[]} messageIds - Array of message IDs
 * @returns {Object} Results
 */
function bulkMarkUnread(messageIds) {
  const results = {
    marked: 0,
    failed: 0
  };

  messageIds.forEach(function(messageId) {
    try {
      const message = GmailApp.getMessageById(messageId);
      if (message) {
        message.getThread().markUnread();
        results.marked++;
      }
    } catch (e) {
      results.failed++;
    }
  });

  trackFeatureUsage('bulk_mark_unread');
  return results;
}

/**
 * Get inbox summary for bulk actions
 * @param {number} count - Number of threads to analyze
 * @returns {Object} Summary with counts and categories
 */
function getInboxSummary(count) {
  count = count || 50;
  const threads = GmailApp.getInboxThreads(0, count);

  const summary = {
    total: threads.length,
    unread: 0,
    categories: {},
    oldestDate: null,
    newestDate: null,
    threats: {
      high: 0,
      medium: 0,
      low: 0
    }
  };

  threads.forEach(function(thread) {
    try {
      if (thread.isUnread()) {
        summary.unread++;
      }

      const message = thread.getMessages()[0];
      const date = message.getDate();

      if (!summary.oldestDate || date < summary.oldestDate) {
        summary.oldestDate = date;
      }
      if (!summary.newestDate || date > summary.newestDate) {
        summary.newestDate = date;
      }

      // Quick threat check
      const from = message.getFrom();
      if (!isSenderWhitelisted(from)) {
        const check = quickSecurityCheck(message);
        if (check.threatLevel === 'high' || check.threatLevel === 'critical') {
          summary.threats.high++;
        } else if (check.threatLevel === 'medium') {
          summary.threats.medium++;
        } else if (check.threatLevel === 'low') {
          summary.threats.low++;
        }
      }
    } catch (e) {
      // Skip errors
    }
  });

  return summary;
}
