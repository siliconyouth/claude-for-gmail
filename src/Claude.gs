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
 * Uses user preferences for tone, length, greeting, and signature
 * @param {string} emailBody - The original email content
 * @param {string} instructions - Optional instructions for the reply
 * @returns {string} A draft reply
 */
function generateReply(emailBody, instructions) {
  // Get user preferences
  const tone = getPreference(PREF_REPLY_TONE, DEFAULT_REPLY_TONE);
  const length = getPreference(PREF_REPLY_LENGTH, DEFAULT_REPLY_LENGTH);
  const includeGreeting = getPreference(PREF_INCLUDE_GREETING, DEFAULT_INCLUDE_GREETING);
  const includeSignature = getPreference(PREF_INCLUDE_SIGNATURE, DEFAULT_INCLUDE_SIGNATURE);
  const signatureText = getPreference(PREF_SIGNATURE_TEXT, DEFAULT_SIGNATURE_TEXT);

  // Build tone instructions
  const toneMap = {
    'professional': 'professional and polished',
    'friendly': 'warm and friendly',
    'formal': 'formal and respectful',
    'casual': 'casual and relaxed',
    'brief': 'brief and direct'
  };

  // Build length instructions
  const lengthMap = {
    'concise': '1-2 short paragraphs',
    'detailed': '3-4 paragraphs with more detail',
    'brief': '1-2 sentences only'
  };

  let systemPrompt = `You are an email assistant helping to draft replies.

Tone: Write in a ${toneMap[tone] || 'professional'} style.
Length: Keep the reply to ${lengthMap[length] || '1-2 paragraphs'}.`;

  if (includeGreeting) {
    systemPrompt += '\nStart with an appropriate greeting (Hi/Hello + name if known).';
  } else {
    systemPrompt += '\nDo not include a greeting - start directly with the response.';
  }

  if (includeSignature && signatureText) {
    systemPrompt += `\nEnd with this signature: ${signatureText}`;
  } else if (includeSignature) {
    systemPrompt += '\nEnd with an appropriate sign-off (Best regards, Thanks, etc.).';
  } else {
    systemPrompt += '\nDo not include a sign-off or signature.';
  }

  systemPrompt += '\nDo not include a subject line - just the email body.';

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

// ============================================================================
// THREAD ANALYSIS
// ============================================================================

/**
 * Analyze an entire email thread - summarize conversation, track decisions, identify open questions
 * @param {GmailMessage} message - Any message in the thread
 * @returns {Object} Thread analysis with summary, decisions, questions, participants
 */
function analyzeThread(message) {
  const thread = message.getThread();
  const messages = thread.getMessages();
  const threadId = thread.getId();

  // Check cache
  const cacheKey = getAnalysisCacheKey(threadId, 'thread');
  const cached = getCached(cacheKey);
  if (cached) {
    Logger.log('Using cached thread analysis for: ' + threadId);
    return cached;
  }

  // Build thread content for analysis
  let threadContent = `Subject: ${thread.getFirstMessageSubject()}\n`;
  threadContent += `Total messages: ${messages.length}\n\n`;

  messages.forEach(function(msg, index) {
    const dateStr = Utilities.formatDate(msg.getDate(), Session.getScriptTimeZone(), 'MMM d, yyyy h:mm a');
    threadContent += `--- Message ${index + 1} ---\n`;
    threadContent += `From: ${msg.getFrom()}\n`;
    threadContent += `Date: ${dateStr}\n`;
    threadContent += `${getEmailBody(msg)}\n\n`;
  });

  const systemPrompt = `You are an email thread analyst. Analyze the entire conversation and return JSON with:

1. summary: 2-4 sentence summary of the entire thread conversation
2. participants: array of participant names/emails and their roles (e.g., "initiator", "responder", "cc'd")
3. decisions: array of decisions or agreements made in the thread
4. openQuestions: array of unresolved questions or pending items
5. nextSteps: array of action items or next steps mentioned
6. tone: overall tone of the conversation ("collaborative", "tense", "formal", "casual", "urgent")
7. status: thread status ("ongoing", "resolved", "waiting_response", "action_needed")

Be specific and actionable. If no items exist for a category, use an empty array.
Respond ONLY with valid JSON, no other text.`;

  const prompt = `Analyze this email thread:\n\n${threadContent}`;

  const response = askClaude(prompt, systemPrompt);

  let result;
  try {
    result = parseClaudeJson(response);
  } catch (e) {
    logError('Thread JSON parse', e);
    result = {
      summary: 'Unable to analyze thread',
      participants: [],
      decisions: [],
      openQuestions: [],
      nextSteps: [],
      tone: 'unknown',
      status: 'unknown'
    };
  }

  // Add metadata
  result.messageCount = messages.length;
  result.subject = thread.getFirstMessageSubject();

  // Cache the result
  setCached(cacheKey, result);

  return result;
}

// ============================================================================
// MULTI-LANGUAGE SUPPORT
// ============================================================================

/**
 * Detect the language of an email
 * @param {string} emailBody - The email content
 * @returns {Object} Language detection result with code and confidence
 */
function detectLanguage(emailBody) {
  const systemPrompt = `You are a language detection expert. Analyze the text and return JSON with:
- language: the ISO 639-1 language code (e.g., "en", "es", "fr", "de", "zh", "ja", "ko", "ar", "ru", "pt")
- languageName: the full name of the language in English
- confidence: "high", "medium", or "low"
- script: the writing script used (e.g., "Latin", "Cyrillic", "Arabic", "CJK", "Devanagari")

Respond ONLY with valid JSON, no other text.`;

  const prompt = `Detect the language of this text:\n\n${emailBody.substring(0, 2000)}`;

  const response = askClaude(prompt, systemPrompt);

  try {
    return parseClaudeJson(response);
  } catch (e) {
    return {
      language: 'en',
      languageName: 'English',
      confidence: 'low',
      script: 'Latin'
    };
  }
}

/**
 * Translate email content to a target language
 * @param {string} emailBody - The email content to translate
 * @param {string} targetLanguage - Target language code (e.g., "en", "es", "fr")
 * @returns {Object} Translation result
 */
function translateEmail(emailBody, targetLanguage) {
  const languageNames = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'zh': 'Chinese', 'ja': 'Japanese',
    'ko': 'Korean', 'ar': 'Arabic', 'ru': 'Russian', 'hi': 'Hindi',
    'nl': 'Dutch', 'pl': 'Polish', 'tr': 'Turkish', 'vi': 'Vietnamese'
  };

  const targetName = languageNames[targetLanguage] || targetLanguage;

  const systemPrompt = `You are a professional translator. Translate the email to ${targetName}.
Maintain the original tone, formatting, and intent. Keep names, dates, and technical terms as appropriate.
Return JSON with:
- translatedText: the full translation
- sourceLanguage: detected source language code
- notes: any translation notes (optional, use empty string if none)

Respond ONLY with valid JSON, no other text.`;

  const prompt = `Translate this email to ${targetName}:\n\n${emailBody}`;

  const response = askClaude(prompt, systemPrompt);

  try {
    return parseClaudeJson(response);
  } catch (e) {
    return {
      translatedText: emailBody,
      sourceLanguage: 'unknown',
      notes: 'Translation failed'
    };
  }
}

/**
 * Generate a reply in a specific language
 * @param {string} emailBody - The original email content
 * @param {string} instructions - Reply instructions
 * @param {string} replyLanguage - Language code for the reply
 * @returns {string} Generated reply in the specified language
 */
function generateReplyInLanguage(emailBody, instructions, replyLanguage) {
  const languageNames = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'zh': 'Chinese', 'ja': 'Japanese',
    'ko': 'Korean', 'ar': 'Arabic', 'ru': 'Russian', 'hi': 'Hindi'
  };

  const languageName = languageNames[replyLanguage] || replyLanguage;

  // Get user preferences
  const tone = getPreference(PREF_REPLY_TONE, DEFAULT_REPLY_TONE);
  const length = getPreference(PREF_REPLY_LENGTH, DEFAULT_REPLY_LENGTH);
  const includeGreeting = getPreference(PREF_INCLUDE_GREETING, DEFAULT_INCLUDE_GREETING);
  const includeSignature = getPreference(PREF_INCLUDE_SIGNATURE, DEFAULT_INCLUDE_SIGNATURE);
  const signatureText = getPreference(PREF_SIGNATURE_TEXT, DEFAULT_SIGNATURE_TEXT);

  let systemPrompt = `You are an email assistant. Write the reply in ${languageName}.
Use appropriate greetings and sign-offs for ${languageName} culture and business norms.

Tone: ${tone}
Length: ${length === 'concise' ? '1-2 paragraphs' : length === 'detailed' ? '3-4 paragraphs' : '1-2 sentences'}`;

  if (includeGreeting) {
    systemPrompt += `\nStart with an appropriate ${languageName} greeting.`;
  }

  if (includeSignature && signatureText) {
    systemPrompt += `\nEnd with: ${signatureText}`;
  }

  let prompt = `Write a reply in ${languageName} to this email:\n\n${emailBody}`;

  if (instructions) {
    prompt += `\n\nInstructions: ${instructions}`;
  }

  return askClaude(prompt, systemPrompt);
}

// ============================================================================
// SMART FOLLOW-UP DETECTION
// ============================================================================

/**
 * Analyze if an email needs follow-up and suggest when
 * @param {string} emailBody - The email content
 * @param {string} messageId - Message ID for caching
 * @returns {Object} Follow-up analysis
 */
function analyzeFollowUp(emailBody, messageId) {
  // Check cache
  if (messageId) {
    const cacheKey = getAnalysisCacheKey(messageId, 'followup');
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const systemPrompt = `You are an email assistant analyzing if follow-up is needed.
Return JSON with:
- needsFollowUp: boolean - true if this email requires a response or follow-up
- urgency: "high", "medium", "low", or "none"
- suggestedTimeframe: when to follow up (e.g., "within 24 hours", "by end of week", "within 2 days", "no follow-up needed")
- reason: brief explanation of why follow-up is or isn't needed
- followUpType: "reply_expected", "action_required", "fyi_only", "meeting_request", "deadline_reminder"

Respond ONLY with valid JSON, no other text.`;

  const prompt = `Analyze if this email needs follow-up:\n\n${emailBody}`;

  const response = askClaude(prompt, systemPrompt);

  let result;
  try {
    result = parseClaudeJson(response);
  } catch (e) {
    result = {
      needsFollowUp: false,
      urgency: 'none',
      suggestedTimeframe: 'no follow-up needed',
      reason: 'Unable to analyze',
      followUpType: 'fyi_only'
    };
  }

  // Cache the result
  if (messageId) {
    setCached(getAnalysisCacheKey(messageId, 'followup'), result);
  }

  return result;
}

// ============================================================================
// MEETING DETECTION
// ============================================================================

/**
 * Extract meeting/event information from an email
 * @param {string} emailBody - The email content
 * @param {string} messageId - Message ID for caching
 * @returns {Object} Meeting detection result
 */
function detectMeeting(emailBody, messageId) {
  // Check cache
  if (messageId) {
    const cacheKey = getAnalysisCacheKey(messageId, 'meeting');
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const systemPrompt = `You are an email assistant that detects meeting requests and event information.
Return JSON with:
- hasMeeting: boolean - true if email mentions a meeting, call, or event
- meetingType: "video_call", "phone_call", "in_person", "webinar", "interview", "other", or null
- title: suggested event title (or null)
- proposedDates: array of date/time strings mentioned (or empty array)
- duration: estimated duration if mentioned (or null)
- location: meeting location or video link if mentioned (or null)
- attendees: array of mentioned attendees (or empty array)
- agenda: brief meeting agenda if mentioned (or null)
- isConfirmed: boolean - true if meeting is confirmed, false if proposed/tentative

Respond ONLY with valid JSON, no other text.`;

  const prompt = `Extract meeting information from this email:\n\n${emailBody}`;

  const response = askClaude(prompt, systemPrompt);

  let result;
  try {
    result = parseClaudeJson(response);
  } catch (e) {
    result = {
      hasMeeting: false,
      meetingType: null,
      title: null,
      proposedDates: [],
      duration: null,
      location: null,
      attendees: [],
      agenda: null,
      isConfirmed: false
    };
  }

  // Cache the result
  if (messageId) {
    setCached(getAnalysisCacheKey(messageId, 'meeting'), result);
  }

  return result;
}
