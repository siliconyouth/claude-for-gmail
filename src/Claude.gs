/**
 * Claude API integration for Gmail
 * With retry logic and caching for reliability
 */

/**
 * Send a message to Claude and get a response (with retry logic)
 * @param {string} prompt - The user prompt
 * @param {string} systemPrompt - Optional system prompt
 * @returns {string} Claude's response text
 */
function askClaude(prompt, systemPrompt) {
  validateApiKey();

  return withRetry(function() {
    return askClaudeInternal(prompt, systemPrompt);
  }, {
    maxRetries: 3,
    initialDelay: 2000,
    maxDelay: 30000
  });
}

/**
 * Internal Claude API call (without retry wrapper)
 * @param {string} prompt - The user prompt
 * @param {string} systemPrompt - Optional system prompt
 * @returns {string} Claude's response text
 */
function askClaudeInternal(prompt, systemPrompt) {
  const apiKey = getApiKey();

  const payload = {
    model: CONFIG.CLAUDE_MODEL,
    max_tokens: CONFIG.MAX_TOKENS,
    messages: [
      { role: 'user', content: prompt }
    ]
  };

  if (systemPrompt) {
    payload.system = systemPrompt;
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(CONFIG.CLAUDE_API_URL, options);
  const responseCode = response.getResponseCode();
  const responseBody = JSON.parse(response.getContentText());

  if (responseCode !== 200) {
    throw new Error(`Claude API error (${responseCode}): ${responseBody.error?.message || 'Unknown error'}`);
  }

  return responseBody.content[0].text;
}

/**
 * Summarize an email using Claude (with caching)
 * @param {string} emailBody - The email content to summarize
 * @param {string} messageId - Optional message ID for caching
 * @returns {string} A summary of the email
 */
function summarizeEmail(emailBody, messageId) {
  // Use cache if messageId provided
  if (messageId) {
    const cacheKey = getAnalysisCacheKey(messageId, 'summary');
    const cached = getCached(cacheKey);
    if (cached) {
      Logger.log('Using cached summary for: ' + messageId);
      return cached;
    }
  }

  const systemPrompt = `You are an email assistant. Provide concise, actionable summaries of emails.
Focus on: key points, action items, deadlines, and important details.
Keep summaries under 3 sentences unless the email is very complex.`;

  const prompt = `Please summarize this email:\n\n${emailBody}`;

  const result = askClaude(prompt, systemPrompt);

  // Cache the result
  if (messageId) {
    setCached(getAnalysisCacheKey(messageId, 'summary'), result);
  }

  return result;
}

/**
 * Generate a reply draft using Claude
 * Note: Replies are not cached as they depend on user instructions
 * @param {string} emailBody - The original email content
 * @param {string} instructions - Optional instructions for the reply
 * @returns {string} A draft reply
 */
function generateReply(emailBody, instructions) {
  const systemPrompt = `You are an email assistant helping to draft professional replies.
Write clear, concise, and appropriate responses.
Match the tone of the original email when possible.
Do not include a subject line - just the email body.`;

  let prompt = `Please draft a reply to this email:\n\n${emailBody}`;

  if (instructions) {
    prompt += `\n\nAdditional instructions: ${instructions}`;
  }

  return askClaude(prompt, systemPrompt);
}

/**
 * Analyze email sentiment and priority (with caching)
 * @param {string} emailBody - The email content to analyze
 * @param {string} messageId - Optional message ID for caching
 * @returns {Object} Analysis results with sentiment and priority
 */
function analyzeEmail(emailBody, messageId) {
  // Use cache if messageId provided
  if (messageId) {
    const cacheKey = getAnalysisCacheKey(messageId, 'analysis');
    const cached = getCached(cacheKey);
    if (cached) {
      Logger.log('Using cached analysis for: ' + messageId);
      return cached;
    }
  }

  const systemPrompt = `You are an email analyst. Analyze emails and return JSON with:
- sentiment: "positive", "negative", or "neutral"
- priority: "high", "medium", or "low"
- category: brief category like "meeting", "request", "info", "urgent", etc.
- summary: one sentence summary
Respond ONLY with valid JSON, no other text.`;

  const prompt = `Analyze this email:\n\n${emailBody}`;

  const response = askClaude(prompt, systemPrompt);

  let result;
  try {
    result = parseClaudeJson(response);
  } catch (e) {
    logError('JSON parse', e);
    result = {
      sentiment: 'neutral',
      priority: 'medium',
      category: 'unknown',
      summary: 'Unable to analyze email'
    };
  }

  // Cache the result
  if (messageId) {
    setCached(getAnalysisCacheKey(messageId, 'analysis'), result);
  }

  return result;
}

/**
 * Extract action items, deadlines, and dependencies from an email (with caching)
 * @param {string} emailBody - The email content to analyze
 * @param {string} messageId - Optional message ID for caching
 * @returns {Object} Extracted items with tasks, deadlines, and waitingOn arrays
 */
function extractActionItems(emailBody, messageId) {
  // Use cache if messageId provided
  if (messageId) {
    const cacheKey = getAnalysisCacheKey(messageId, 'actions');
    const cached = getCached(cacheKey);
    if (cached) {
      Logger.log('Using cached action items for: ' + messageId);
      return cached;
    }
  }

  const systemPrompt = `You are an email analyst specializing in extracting actionable information.
Extract and return JSON with:
- tasks: array of action items/todos mentioned (things the recipient should do)
- deadlines: array of dates or timeframes mentioned (e.g., "by Friday", "January 15th", "end of week")
- waitingOn: array of things the sender is waiting for or dependencies on other people

Be specific and actionable. If no items exist for a category, use an empty array.
Respond ONLY with valid JSON, no other text.`;

  const prompt = `Extract action items from this email:\n\n${emailBody}`;

  const response = askClaude(prompt, systemPrompt);

  let result;
  try {
    result = parseClaudeJson(response);
  } catch (e) {
    logError('JSON parse', e);
    result = {
      tasks: [],
      deadlines: [],
      waitingOn: []
    };
  }

  // Cache the result
  if (messageId) {
    setCached(getAnalysisCacheKey(messageId, 'actions'), result);
  }

  return result;
}

/**
 * Perform full analysis with a single API call (more efficient)
 * @param {string} emailBody - The email content
 * @param {string} messageId - Optional message ID for caching
 * @returns {Object} Complete analysis with summary, analysis, and actionItems
 */
function fullEmailAnalysis(emailBody, messageId) {
  // Check cache first
  if (messageId) {
    const cacheKey = getAnalysisCacheKey(messageId, 'full');
    const cached = getCached(cacheKey);
    if (cached) {
      Logger.log('Using cached full analysis for: ' + messageId);
      return cached;
    }
  }

  const systemPrompt = `You are an email analyst. Perform a complete analysis and return JSON with:

1. summary: 2-3 sentence summary focusing on key points and actions needed
2. analysis:
   - sentiment: "positive", "negative", or "neutral"
   - priority: "high", "medium", or "low"
   - category: one of "meeting", "request", "info", "sales", "support", "newsletter", "personal", "finance"
3. actionItems:
   - tasks: array of action items (things recipient should do)
   - deadlines: array of dates/timeframes mentioned
   - waitingOn: array of dependencies on others

Respond ONLY with valid JSON, no other text.`;

  const prompt = `Perform a complete analysis of this email:\n\n${emailBody}`;

  const response = askClaude(prompt, systemPrompt);

  let result;
  try {
    result = parseClaudeJson(response);
  } catch (e) {
    logError('JSON parse', e);
    result = {
      summary: 'Unable to analyze email',
      analysis: {
        sentiment: 'neutral',
        priority: 'medium',
        category: 'unknown'
      },
      actionItems: {
        tasks: [],
        deadlines: [],
        waitingOn: []
      }
    };
  }

  // Cache the result
  if (messageId) {
    setCached(getAnalysisCacheKey(messageId, 'full'), result);
  }

  return result;
}
