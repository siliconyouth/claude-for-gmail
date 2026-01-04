/**
 * Email Templates with AI Fill-in
 * Save and reuse common reply templates with Claude-powered placeholders
 */

// Default templates to start with
const DEFAULT_TEMPLATES = [
  {
    id: 'acknowledge',
    name: 'Acknowledge Receipt',
    description: 'Confirm you received the email and will respond later',
    template: 'Thank you for your email regarding {{subject}}. I wanted to acknowledge receipt and let you know I will review this and get back to you {{timeframe}}.\n\nBest regards'
  },
  {
    id: 'meeting_accept',
    name: 'Accept Meeting',
    description: 'Accept a meeting invitation',
    template: 'Thank you for the meeting invitation. I confirm my attendance for {{meeting_details}}.\n\n{{additional_notes}}\n\nLooking forward to it.'
  },
  {
    id: 'meeting_decline',
    name: 'Decline Meeting',
    description: 'Politely decline a meeting',
    template: 'Thank you for thinking of me for this meeting. Unfortunately, {{reason}}.\n\n{{alternative}}\n\nBest regards'
  },
  {
    id: 'request_info',
    name: 'Request More Info',
    description: 'Ask for additional information',
    template: 'Thank you for reaching out. Before I can {{action}}, I would need some additional information:\n\n{{questions}}\n\nOnce I have these details, I will be happy to assist.\n\nBest regards'
  },
  {
    id: 'followup',
    name: 'Follow Up',
    description: 'Follow up on a previous email',
    template: 'I wanted to follow up on my previous email regarding {{subject}}.\n\n{{context}}\n\nPlease let me know if you need any additional information.\n\nBest regards'
  },
  {
    id: 'thank_you',
    name: 'Thank You',
    description: 'Express gratitude',
    template: 'Thank you so much for {{reason}}. {{appreciation}}\n\n{{next_steps}}\n\nBest regards'
  },
  {
    id: 'out_of_office',
    name: 'Out of Office Response',
    description: 'Let someone know you are away',
    template: 'Thank you for your email. I am currently {{status}} and will have limited access to email until {{return_date}}.\n\n{{urgent_contact}}\n\nI will respond to your email upon my return.\n\nBest regards'
  },
  {
    id: 'introduction',
    name: 'Self Introduction',
    description: 'Introduce yourself',
    template: 'Thank you for connecting. {{intro}}\n\n{{background}}\n\n{{call_to_action}}\n\nBest regards'
  }
];

/**
 * Get all templates (default + user-created)
 * @returns {Object[]} Array of template objects
 */
function getTemplates() {
  const userTemplates = getPreference('templates', []);
  return [...DEFAULT_TEMPLATES, ...userTemplates];
}

/**
 * Get a specific template by ID
 * @param {string} templateId - The template ID
 * @returns {Object|null} The template or null if not found
 */
function getTemplateById(templateId) {
  const templates = getTemplates();
  return templates.find(t => t.id === templateId) || null;
}

/**
 * Save a new user template
 * @param {Object} template - Template object with name, description, template
 * @returns {Object} The saved template with generated ID
 */
function saveTemplate(template) {
  const userTemplates = getPreference('templates', []);

  const newTemplate = {
    id: 'user_' + Date.now(),
    name: template.name,
    description: template.description || '',
    template: template.template,
    createdAt: new Date().toISOString()
  };

  userTemplates.push(newTemplate);
  setPreference('templates', userTemplates);

  return newTemplate;
}

/**
 * Delete a user template
 * @param {string} templateId - The template ID to delete
 * @returns {boolean} Whether the template was deleted
 */
function deleteTemplate(templateId) {
  // Can't delete default templates
  if (!templateId.startsWith('user_')) {
    return false;
  }

  const userTemplates = getPreference('templates', []);
  const filtered = userTemplates.filter(t => t.id !== templateId);

  if (filtered.length !== userTemplates.length) {
    setPreference('templates', filtered);
    return true;
  }

  return false;
}

/**
 * Fill in a template using Claude AI based on email context
 * @param {string} templateId - The template ID
 * @param {string} emailBody - The original email to respond to
 * @param {string} additionalContext - Any additional context from the user
 * @returns {string} The filled-in template
 */
function fillTemplate(templateId, emailBody, additionalContext) {
  const template = getTemplateById(templateId);

  if (!template) {
    throw new Error('Template not found: ' + templateId);
  }

  // Extract placeholders from template
  const placeholders = extractPlaceholders(template.template);

  if (placeholders.length === 0) {
    // No placeholders, return template as-is
    return template.template;
  }

  const systemPrompt = `You are an email assistant filling in a template.
Given an email and a reply template with placeholders, fill in the placeholders with appropriate content.

Template: ${template.template}

Placeholders to fill: ${placeholders.join(', ')}

Rules:
- Keep the same structure and formatting as the template
- Make content appropriate for a professional email
- Keep placeholder content concise (1-2 sentences max per placeholder)
- Match the tone indicated by the template
- If a placeholder doesn't apply, use a sensible default or skip it gracefully

Return ONLY the filled template, no other text or explanation.`;

  let prompt = `Original email to respond to:\n\n${emailBody}`;

  if (additionalContext) {
    prompt += `\n\nAdditional context from user: ${additionalContext}`;
  }

  prompt += '\n\nPlease fill in the template placeholders appropriately.';

  return askClaude(prompt, systemPrompt);
}

/**
 * Extract placeholder names from a template
 * @param {string} template - The template string
 * @returns {string[]} Array of placeholder names
 */
function extractPlaceholders(template) {
  const regex = /\{\{([^}]+)\}\}/g;
  const placeholders = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }

  return placeholders;
}

/**
 * Apply a template to an email and create a draft
 * @param {string} messageId - The Gmail message ID to reply to
 * @param {string} templateId - The template ID to use
 * @param {string} additionalContext - Optional additional context
 * @returns {Object} Result with draft ID and content
 */
function applyTemplateToEmail(messageId, templateId, additionalContext) {
  const message = GmailApp.getMessageById(messageId);

  if (!message) {
    throw new Error('Message not found: ' + messageId);
  }

  const body = getEmailBody(message);
  const filledTemplate = fillTemplate(templateId, body, additionalContext);
  const draft = createReplyDraft(message, filledTemplate);

  return {
    draftId: draft.getId(),
    content: filledTemplate,
    templateId: templateId
  };
}

/**
 * Preview how a template would be filled for an email
 * @param {string} messageId - The Gmail message ID
 * @param {string} templateId - The template ID
 * @returns {string} The filled template preview
 */
function previewTemplate(messageId, templateId) {
  const message = GmailApp.getMessageById(messageId);

  if (!message) {
    throw new Error('Message not found: ' + messageId);
  }

  const body = getEmailBody(message);
  return fillTemplate(templateId, body, '');
}

/**
 * Get template suggestions for an email based on its content
 * @param {string} emailBody - The email content
 * @returns {Object[]} Array of suggested templates with relevance scores
 */
function suggestTemplates(emailBody) {
  const systemPrompt = `You are an email assistant suggesting reply templates.
Given an email, suggest which templates would be most appropriate for a reply.

Available templates:
${DEFAULT_TEMPLATES.map(t => `- ${t.id}: ${t.name} - ${t.description}`).join('\n')}

Return JSON with:
- suggestions: array of objects with templateId, relevance (0-100), and reason

Only suggest templates with relevance > 50.
Respond ONLY with valid JSON.`;

  const prompt = `Which templates would be good for replying to this email?\n\n${emailBody}`;

  const response = askClaude(prompt, systemPrompt);

  try {
    const result = JSON.parse(response);
    return result.suggestions || [];
  } catch (e) {
    Logger.log('Failed to parse template suggestions: ' + response);
    return [];
  }
}
