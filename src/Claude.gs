/**
 * Claude API integration for Gmail
 */

/**
 * Send a message to Claude and get a response
 * @param {string} prompt - The user prompt
 * @param {string} systemPrompt - Optional system prompt
 * @returns {string} Claude's response text
 */
function askClaude(prompt, systemPrompt) {
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
 * Summarize an email using Claude
 * @param {string} emailBody - The email content to summarize
 * @returns {string} A summary of the email
 */
function summarizeEmail(emailBody) {
  const systemPrompt = `You are an email assistant. Provide concise, actionable summaries of emails.
Focus on: key points, action items, deadlines, and important details.
Keep summaries under 3 sentences unless the email is very complex.`;

  const prompt = `Please summarize this email:\n\n${emailBody}`;

  return askClaude(prompt, systemPrompt);
}

/**
 * Generate a reply draft using Claude
 * @param {string} emailBody - The original email content
 * @param {string} instructions - Optional instructions for the reply
 * @returns {string} A draft reply
 */
function generateReply(emailBody, instructions) {
  const systemPrompt = `You are an email assistant helping to draft professional replies.
Write clear, concise, and appropriate responses.
Match the tone of the original email when possible.`;

  let prompt = `Please draft a reply to this email:\n\n${emailBody}`;

  if (instructions) {
    prompt += `\n\nAdditional instructions: ${instructions}`;
  }

  return askClaude(prompt, systemPrompt);
}

/**
 * Analyze email sentiment and priority
 * @param {string} emailBody - The email content to analyze
 * @returns {Object} Analysis results with sentiment and priority
 */
function analyzeEmail(emailBody) {
  const systemPrompt = `You are an email analyst. Analyze emails and return JSON with:
- sentiment: "positive", "negative", or "neutral"
- priority: "high", "medium", or "low"
- category: brief category like "meeting", "request", "info", "urgent", etc.
- summary: one sentence summary
Respond ONLY with valid JSON, no other text.`;

  const prompt = `Analyze this email:\n\n${emailBody}`;

  const response = askClaude(prompt, systemPrompt);

  try {
    return JSON.parse(response);
  } catch (e) {
    Logger.log('Failed to parse Claude response as JSON: ' + response);
    return {
      sentiment: 'neutral',
      priority: 'medium',
      category: 'unknown',
      summary: 'Unable to analyze email'
    };
  }
}

/**
 * Extract action items, deadlines, and dependencies from an email
 * @param {string} emailBody - The email content to analyze
 * @returns {Object} Extracted items with tasks, deadlines, and waitingOn arrays
 */
function extractActionItems(emailBody) {
  const systemPrompt = `You are an email analyst specializing in extracting actionable information.
Extract and return JSON with:
- tasks: array of action items/todos mentioned (things the recipient should do)
- deadlines: array of dates or timeframes mentioned (e.g., "by Friday", "January 15th", "end of week")
- waitingOn: array of things the sender is waiting for or dependencies on other people

Be specific and actionable. If no items exist for a category, use an empty array.
Respond ONLY with valid JSON, no other text.`;

  const prompt = `Extract action items from this email:\n\n${emailBody}`;

  const response = askClaude(prompt, systemPrompt);

  try {
    return JSON.parse(response);
  } catch (e) {
    Logger.log('Failed to parse action items response: ' + response);
    return {
      tasks: [],
      deadlines: [],
      waitingOn: []
    };
  }
}
