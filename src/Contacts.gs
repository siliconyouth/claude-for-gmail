/**
 * Contact Insights
 * Analyze sender history and communication patterns
 */

/**
 * Get insights about a contact based on email history
 * @param {string} emailAddress - The contact's email address
 * @returns {Object} Contact insights
 */
function getContactInsights(emailAddress) {
  // Check cache first
  const cacheKey = 'contact_insights_' + emailAddress.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Search for emails from/to this contact
    const sentQuery = 'to:' + emailAddress;
    const receivedQuery = 'from:' + emailAddress;

    const sentThreads = GmailApp.search(sentQuery, 0, 50);
    const receivedThreads = GmailApp.search(receivedQuery, 0, 50);

    // Analyze communication patterns
    const sentMessages = getMessagesFromThreads(sentThreads);
    const receivedMessages = getMessagesFromThreads(receivedThreads);

    const insights = {
      email: emailAddress,
      name: extractName(emailAddress, receivedMessages),
      stats: {
        totalConversations: countUniqueThreads(sentThreads, receivedThreads),
        emailsSent: sentMessages.length,
        emailsReceived: receivedMessages.length,
        firstContact: getEarliestDate(sentMessages, receivedMessages),
        lastContact: getLatestDate(sentMessages, receivedMessages)
      },
      patterns: analyzePatterns(sentMessages, receivedMessages),
      topics: extractTopics(sentMessages, receivedMessages),
      responseTime: calculateAverageResponseTime(sentThreads, receivedThreads, emailAddress),
      relationship: determineRelationship(sentMessages, receivedMessages)
    };

    // Cache for 1 hour
    setCached(cacheKey, insights, 3600);

    // Track analytics
    trackFeatureUsage('contact_insights');

    return insights;

  } catch (error) {
    Logger.log('Contact insights error: ' + error.message);
    return {
      email: emailAddress,
      error: error.message,
      stats: { totalConversations: 0, emailsSent: 0, emailsReceived: 0 }
    };
  }
}

/**
 * Get messages from threads
 * @param {Array} threads - Gmail threads
 * @returns {Array} Array of message objects
 */
function getMessagesFromThreads(threads) {
  const messages = [];

  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(msg) {
      messages.push({
        id: msg.getId(),
        date: msg.getDate(),
        subject: msg.getSubject(),
        from: msg.getFrom(),
        to: msg.getTo()
      });
    });
  });

  return messages;
}

/**
 * Count unique threads
 * @param {Array} threads1 - First set of threads
 * @param {Array} threads2 - Second set of threads
 * @returns {number} Count of unique threads
 */
function countUniqueThreads(threads1, threads2) {
  const ids = {};

  threads1.forEach(function(t) { ids[t.getId()] = true; });
  threads2.forEach(function(t) { ids[t.getId()] = true; });

  return Object.keys(ids).length;
}

/**
 * Extract name from email or messages
 * @param {string} email - Email address
 * @param {Array} messages - Messages from contact
 * @returns {string} Best guess at name
 */
function extractName(email, messages) {
  // Try to get name from "From" field
  if (messages.length > 0) {
    const from = messages[0].from;
    const nameMatch = from.match(/^([^<]+)</);
    if (nameMatch) {
      return nameMatch[1].trim().replace(/"/g, '');
    }
  }

  // Extract from email address
  const localPart = email.split('@')[0];
  const parts = localPart.split(/[._-]/);

  return parts.map(function(p) {
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join(' ');
}

/**
 * Get earliest date from messages
 * @param {Array} sent - Sent messages
 * @param {Array} received - Received messages
 * @returns {string} ISO date string
 */
function getEarliestDate(sent, received) {
  const all = sent.concat(received);
  if (all.length === 0) return null;

  const earliest = all.reduce(function(min, msg) {
    return msg.date < min ? msg.date : min;
  }, all[0].date);

  return earliest.toISOString();
}

/**
 * Get latest date from messages
 * @param {Array} sent - Sent messages
 * @param {Array} received - Received messages
 * @returns {string} ISO date string
 */
function getLatestDate(sent, received) {
  const all = sent.concat(received);
  if (all.length === 0) return null;

  const latest = all.reduce(function(max, msg) {
    return msg.date > max ? msg.date : max;
  }, all[0].date);

  return latest.toISOString();
}

/**
 * Analyze communication patterns
 * @param {Array} sent - Sent messages
 * @param {Array} received - Received messages
 * @returns {Object} Pattern analysis
 */
function analyzePatterns(sent, received) {
  // Analyze day of week preferences
  const dayCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const hourCount = {};

  const all = sent.concat(received);

  all.forEach(function(msg) {
    dayCount[msg.date.getDay()]++;

    const hour = msg.date.getHours();
    hourCount[hour] = (hourCount[hour] || 0) + 1;
  });

  // Find most active day
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let maxDay = 0;
  let maxDayCount = 0;
  for (var d in dayCount) {
    if (dayCount[d] > maxDayCount) {
      maxDayCount = dayCount[d];
      maxDay = parseInt(d);
    }
  }

  // Find most active hour range
  let maxHour = 9;
  let maxHourCount = 0;
  for (var h in hourCount) {
    if (hourCount[h] > maxHourCount) {
      maxHourCount = hourCount[h];
      maxHour = parseInt(h);
    }
  }

  return {
    mostActiveDay: days[maxDay],
    mostActiveTime: formatHourRange(maxHour),
    frequency: calculateFrequency(all),
    trend: calculateTrend(all)
  };
}

/**
 * Format hour range for display
 * @param {number} hour - Hour (0-23)
 * @returns {string} Formatted range
 */
function formatHourRange(hour) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
  return displayHour + ':00 ' + ampm;
}

/**
 * Calculate communication frequency
 * @param {Array} messages - All messages
 * @returns {string} Frequency description
 */
function calculateFrequency(messages) {
  if (messages.length < 2) return 'New contact';

  const first = messages.reduce(function(min, m) { return m.date < min ? m.date : min; }, messages[0].date);
  const last = messages.reduce(function(max, m) { return m.date > max ? m.date : max; }, messages[0].date);

  const daysDiff = (last - first) / (1000 * 60 * 60 * 24);

  if (daysDiff === 0) return 'Same day';

  const rate = messages.length / daysDiff;

  if (rate >= 1) return 'Daily';
  if (rate >= 0.5) return 'Every few days';
  if (rate >= 0.14) return 'Weekly';
  if (rate >= 0.03) return 'Monthly';
  return 'Occasional';
}

/**
 * Calculate trend (increasing/decreasing communication)
 * @param {Array} messages - All messages
 * @returns {string} Trend description
 */
function calculateTrend(messages) {
  if (messages.length < 5) return 'Not enough data';

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recent = messages.filter(function(m) { return m.date >= thirtyDaysAgo; }).length;
  const older = messages.filter(function(m) { return m.date >= sixtyDaysAgo && m.date < thirtyDaysAgo; }).length;

  if (recent > older * 1.5) return 'Increasing';
  if (recent < older * 0.5) return 'Decreasing';
  return 'Stable';
}

/**
 * Extract common topics from emails
 * @param {Array} sent - Sent messages
 * @param {Array} received - Received messages
 * @returns {Array} Top topics
 */
function extractTopics(sent, received) {
  const all = sent.concat(received);

  if (all.length === 0) return [];

  // Get subjects and use Claude to extract topics
  const subjects = all.slice(0, 20).map(function(m) { return m.subject; }).join('\n');

  try {
    const systemPrompt = `Analyze these email subjects and extract 3-5 main topics or themes.
Return JSON with:
- topics: array of topic strings (short, 1-3 words each)

Respond ONLY with valid JSON.`;

    const response = askClaude(`Extract topics from these email subjects:\n\n${subjects}`, systemPrompt);
    const result = parseClaudeJson(response);

    return result.topics || [];

  } catch (e) {
    // Fallback: extract keywords from subjects
    const words = {};
    all.forEach(function(m) {
      const subjectWords = m.subject.toLowerCase().split(/\s+/);
      subjectWords.forEach(function(w) {
        if (w.length > 3 && !isStopWord(w)) {
          words[w] = (words[w] || 0) + 1;
        }
      });
    });

    return Object.keys(words)
      .sort(function(a, b) { return words[b] - words[a]; })
      .slice(0, 5);
  }
}

/**
 * Check if word is a stop word
 * @param {string} word - Word to check
 * @returns {boolean}
 */
function isStopWord(word) {
  const stopWords = ['the', 'and', 'for', 'that', 'this', 'with', 'your', 'from', 'have', 'will', 'about', 'been', 'were', 'they', 'what', 'when', 'where', 'which'];
  return stopWords.indexOf(word) !== -1;
}

/**
 * Calculate average response time
 * @param {Array} sentThreads - Threads where user sent
 * @param {Array} receivedThreads - Threads where user received
 * @param {string} contactEmail - Contact email
 * @returns {Object} Response time info
 */
function calculateAverageResponseTime(sentThreads, receivedThreads, contactEmail) {
  // This is simplified - full implementation would track reply chains
  return {
    yourAverage: 'N/A',
    theirAverage: 'N/A',
    note: 'Response time analysis requires more data'
  };
}

/**
 * Determine relationship type
 * @param {Array} sent - Sent messages
 * @param {Array} received - Received messages
 * @returns {Object} Relationship info
 */
function determineRelationship(sent, received) {
  const total = sent.length + received.length;
  const ratio = sent.length / (received.length || 1);

  let type = 'Balanced';
  if (ratio > 2) type = 'You reach out more';
  if (ratio < 0.5) type = 'They reach out more';

  let strength = 'New';
  if (total >= 50) strength = 'Strong';
  else if (total >= 20) strength = 'Growing';
  else if (total >= 5) strength = 'Developing';

  return {
    type: type,
    strength: strength,
    balance: Math.round(sent.length / total * 100) + '% initiated by you'
  };
}

/**
 * Get quick contact summary for display
 * @param {string} emailAddress - Contact email
 * @returns {Object} Quick summary
 */
function getQuickContactSummary(emailAddress) {
  const insights = getContactInsights(emailAddress);

  return {
    name: insights.name,
    email: insights.email,
    conversations: insights.stats.totalConversations,
    lastContact: insights.stats.lastContact,
    relationship: insights.relationship.strength
  };
}
