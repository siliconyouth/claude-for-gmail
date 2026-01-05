/**
 * Smart Compose
 * AI-powered writing suggestions as you type
 */

/**
 * Get smart compose suggestions for a partial draft
 * @param {string} draftText - Current draft text
 * @param {string} context - Email context (original email being replied to)
 * @param {Object} options - Suggestion options
 * @returns {Object} Suggestions
 */
function getSmartComposeSuggestions(draftText, context, options) {
  options = options || {};

  if (!draftText || draftText.length < 10) {
    return { suggestions: [] };
  }

  try {
    // Get user preferences
    const tone = getPreference(PREF_REPLY_TONE, DEFAULT_REPLY_TONE);

    const systemPrompt = `You are a smart compose assistant helping complete email drafts.
Given a partial email and context, provide 3 completion suggestions.

Rules:
- Each suggestion should complete the current sentence/thought
- Keep suggestions short (1-2 sentences max)
- Match the tone: ${tone}
- Don't repeat what's already written
- Make suggestions natural and professional

Return JSON with:
- suggestions: array of 3 completion strings
- nextSentence: a suggested next sentence if the current one is complete

Respond ONLY with valid JSON.`;

    let prompt = `Partial draft:\n${draftText}`;

    if (context) {
      prompt = `Original email being replied to:\n${context.substring(0, 1000)}\n\n${prompt}`;
    }

    const response = askClaude(prompt, systemPrompt);
    const result = parseClaudeJson(response);

    // Track analytics
    trackFeatureUsage('smart_compose');

    return {
      suggestions: result.suggestions || [],
      nextSentence: result.nextSentence || null
    };

  } catch (error) {
    Logger.log('Smart compose error: ' + error.message);
    return {
      suggestions: [],
      error: error.message
    };
  }
}

/**
 * Complete a sentence based on context
 * @param {string} partialSentence - Incomplete sentence
 * @param {string} emailContext - Full email context
 * @returns {string} Completed sentence
 */
function completeSentence(partialSentence, emailContext) {
  try {
    const systemPrompt = `Complete this partial sentence naturally.
Return ONLY the completion (not the original text), keeping it brief and professional.`;

    let prompt = `Complete this sentence: "${partialSentence}"`;

    if (emailContext) {
      prompt += `\n\nContext:\n${emailContext.substring(0, 500)}`;
    }

    return askClaude(prompt, systemPrompt);

  } catch (error) {
    return '';
  }
}

/**
 * Suggest reply opening lines based on email
 * @param {string} emailBody - Original email
 * @returns {Array} Array of opening suggestions
 */
function suggestOpeningLines(emailBody) {
  try {
    const tone = getPreference(PREF_REPLY_TONE, DEFAULT_REPLY_TONE);

    const systemPrompt = `Suggest 4 opening lines for a reply to this email.
Tone: ${tone}

Return JSON with:
- openings: array of 4 opening line suggestions

Each should be 1 sentence and appropriate for starting an email reply.
Respond ONLY with valid JSON.`;

    const prompt = `Suggest opening lines for replying to:\n\n${emailBody.substring(0, 1500)}`;

    const response = askClaude(prompt, systemPrompt);
    const result = parseClaudeJson(response);

    return result.openings || [];

  } catch (error) {
    return [
      'Thank you for your email.',
      'I appreciate you reaching out.',
      'Thank you for getting in touch.',
      'I hope this finds you well.'
    ];
  }
}

/**
 * Suggest closing lines based on context
 * @param {string} draftBody - Current draft content
 * @returns {Array} Array of closing suggestions
 */
function suggestClosingLines(draftBody) {
  try {
    const tone = getPreference(PREF_REPLY_TONE, DEFAULT_REPLY_TONE);
    const includeSignature = getPreference(PREF_INCLUDE_SIGNATURE, DEFAULT_INCLUDE_SIGNATURE);

    const systemPrompt = `Suggest 4 closing lines for this email draft.
Tone: ${tone}
Include sign-off: ${includeSignature}

Return JSON with:
- closings: array of 4 closing line suggestions

Each should be 1-2 sentences appropriate for ending the email.
Respond ONLY with valid JSON.`;

    const prompt = `Suggest closing lines for this draft:\n\n${draftBody.substring(0, 1500)}`;

    const response = askClaude(prompt, systemPrompt);
    const result = parseClaudeJson(response);

    return result.closings || [];

  } catch (error) {
    return [
      'Please let me know if you have any questions.',
      'Looking forward to hearing from you.',
      'Thank you for your time.',
      'Happy to discuss further if needed.'
    ];
  }
}

/**
 * Improve email grammar and clarity
 * @param {string} text - Text to improve
 * @returns {Object} Improved text and suggestions
 */
function improveWriting(text) {
  try {
    const systemPrompt = `You are a writing assistant. Improve this text for clarity, grammar, and professionalism.

Return JSON with:
- improved: the improved text
- changes: array of changes made (brief descriptions)
- suggestions: array of optional further improvements

Respond ONLY with valid JSON.`;

    const prompt = `Improve this text:\n\n${text}`;

    const response = askClaude(prompt, systemPrompt);
    const result = parseClaudeJson(response);

    // Track analytics
    trackFeatureUsage('improve_writing');

    return result;

  } catch (error) {
    return {
      improved: text,
      changes: [],
      suggestions: [],
      error: error.message
    };
  }
}

/**
 * Check email tone and suggest adjustments
 * @param {string} text - Email text to check
 * @param {string} targetTone - Desired tone
 * @returns {Object} Tone analysis and suggestions
 */
function checkTone(text, targetTone) {
  targetTone = targetTone || getPreference(PREF_REPLY_TONE, DEFAULT_REPLY_TONE);

  try {
    const systemPrompt = `Analyze the tone of this email and compare it to the target tone.

Target tone: ${targetTone}

Return JSON with:
- currentTone: detected tone of the email
- matchesTarget: boolean
- suggestions: array of specific suggestions to better match target tone
- examples: array of rewritten phrases if changes needed

Respond ONLY with valid JSON.`;

    const prompt = `Analyze tone:\n\n${text}`;

    const response = askClaude(prompt, systemPrompt);
    return parseClaudeJson(response);

  } catch (error) {
    return {
      currentTone: 'unknown',
      matchesTarget: true,
      suggestions: [],
      error: error.message
    };
  }
}

/**
 * Generate subject line suggestions
 * @param {string} emailBody - Email body
 * @param {string} originalSubject - Original subject if reply
 * @returns {Array} Array of subject suggestions
 */
function suggestSubjectLines(emailBody, originalSubject) {
  try {
    const systemPrompt = `Generate 4 subject line suggestions for this email.

Rules:
- Keep subjects under 60 characters
- Be specific and descriptive
- Avoid spam trigger words
- ${originalSubject ? 'This is a reply, so suggestions should be appropriate for a reply thread' : 'This is a new email'}

Return JSON with:
- subjects: array of 4 subject line suggestions

Respond ONLY with valid JSON.`;

    let prompt = `Generate subject lines for:\n\n${emailBody.substring(0, 1000)}`;
    if (originalSubject) {
      prompt += `\n\nOriginal subject: ${originalSubject}`;
    }

    const response = askClaude(prompt, systemPrompt);
    const result = parseClaudeJson(response);

    return result.subjects || [];

  } catch (error) {
    return [];
  }
}

/**
 * Expand abbreviated or short text
 * @param {string} shortText - Brief/abbreviated text
 * @param {string} context - Email context
 * @returns {string} Expanded text
 */
function expandText(shortText, context) {
  try {
    const tone = getPreference(PREF_REPLY_TONE, DEFAULT_REPLY_TONE);

    const systemPrompt = `Expand this brief text into a full, professional paragraph.
Tone: ${tone}
Keep it concise but complete - don't over-elaborate.
Return ONLY the expanded text, no JSON.`;

    let prompt = `Expand this: "${shortText}"`;
    if (context) {
      prompt += `\n\nContext:\n${context.substring(0, 500)}`;
    }

    return askClaude(prompt, systemPrompt);

  } catch (error) {
    return shortText;
  }
}
