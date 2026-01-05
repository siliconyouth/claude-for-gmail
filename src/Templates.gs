/**
 * Email Templates with AI Fill-in
 * Save and reuse common reply templates with Claude-powered placeholders
 */

// Default templates - 25+ pre-built options
const DEFAULT_TEMPLATES = [
  // === ACKNOWLEDGMENT & RECEIPTS ===
  {
    id: 'acknowledge',
    name: 'Acknowledge Receipt',
    description: 'Confirm you received the email and will respond later',
    category: 'acknowledgment',
    template: 'Thank you for your email regarding {{subject}}. I wanted to acknowledge receipt and let you know I will review this and get back to you {{timeframe}}.\n\nBest regards'
  },
  {
    id: 'quick_ack',
    name: 'Quick Acknowledgment',
    description: 'Brief confirmation of receipt',
    category: 'acknowledgment',
    template: 'Got it, thanks! I\'ll {{action}} and get back to you {{timeframe}}.'
  },

  // === MEETINGS ===
  {
    id: 'meeting_accept',
    name: 'Accept Meeting',
    description: 'Accept a meeting invitation',
    category: 'meetings',
    template: 'Thank you for the meeting invitation. I confirm my attendance for {{meeting_details}}.\n\n{{additional_notes}}\n\nLooking forward to it.'
  },
  {
    id: 'meeting_decline',
    name: 'Decline Meeting',
    description: 'Politely decline a meeting',
    category: 'meetings',
    template: 'Thank you for thinking of me for this meeting. Unfortunately, {{reason}}.\n\n{{alternative}}\n\nBest regards'
  },
  {
    id: 'meeting_reschedule',
    name: 'Reschedule Meeting',
    description: 'Request to move a meeting to a different time',
    category: 'meetings',
    template: 'I hope this finds you well. I need to reschedule our meeting originally planned for {{original_time}}.\n\nWould any of these times work for you instead?\n{{proposed_times}}\n\nApologies for any inconvenience.\n\nBest regards'
  },
  {
    id: 'meeting_propose',
    name: 'Propose Meeting',
    description: 'Suggest a meeting time',
    category: 'meetings',
    template: 'I\'d like to schedule a meeting to discuss {{topic}}.\n\nWould any of these times work for you?\n{{proposed_times}}\n\nThe meeting should take approximately {{duration}}.\n\nLooking forward to connecting.'
  },

  // === REQUESTS & QUESTIONS ===
  {
    id: 'request_info',
    name: 'Request Information',
    description: 'Ask for additional information',
    category: 'requests',
    template: 'Thank you for reaching out. Before I can {{action}}, I would need some additional information:\n\n{{questions}}\n\nOnce I have these details, I will be happy to assist.\n\nBest regards'
  },
  {
    id: 'request_deadline',
    name: 'Request Deadline Extension',
    description: 'Ask for more time on a deadline',
    category: 'requests',
    template: 'I\'m writing regarding the deadline for {{project}}.\n\nDue to {{reason}}, I would like to request an extension until {{new_deadline}}.\n\n{{mitigation}}\n\nPlease let me know if this is possible.\n\nBest regards'
  },
  {
    id: 'request_approval',
    name: 'Request Approval',
    description: 'Ask for approval or sign-off',
    category: 'requests',
    template: 'I\'m seeking your approval for {{item}}.\n\n{{details}}\n\n{{justification}}\n\nPlease let me know if you need any additional information to make your decision.\n\nBest regards'
  },

  // === FOLLOW-UPS ===
  {
    id: 'followup',
    name: 'General Follow Up',
    description: 'Follow up on a previous email',
    category: 'followup',
    template: 'I wanted to follow up on my previous email regarding {{subject}}.\n\n{{context}}\n\nPlease let me know if you need any additional information.\n\nBest regards'
  },
  {
    id: 'followup_gentle',
    name: 'Gentle Reminder',
    description: 'Soft follow-up without pressure',
    category: 'followup',
    template: 'I hope you\'re doing well. I wanted to gently follow up on {{subject}}.\n\nNo rush on this - just wanted to make sure it didn\'t slip through the cracks.\n\nBest regards'
  },
  {
    id: 'followup_urgent',
    name: 'Urgent Follow Up',
    description: 'Time-sensitive follow-up',
    category: 'followup',
    template: 'I\'m following up on {{subject}} as this is now time-sensitive.\n\n{{deadline_info}}\n\nCould you please provide an update at your earliest convenience?\n\nThank you for your prompt attention to this matter.'
  },

  // === THANK YOU ===
  {
    id: 'thank_you',
    name: 'Thank You',
    description: 'Express gratitude',
    category: 'thanks',
    template: 'Thank you so much for {{reason}}. {{appreciation}}\n\n{{next_steps}}\n\nBest regards'
  },
  {
    id: 'thank_interview',
    name: 'Thank You (Interview)',
    description: 'Post-interview thank you note',
    category: 'thanks',
    template: 'Thank you for taking the time to meet with me today regarding the {{position}} role.\n\nI enjoyed learning about {{company_topic}} and am excited about the opportunity to {{contribution}}.\n\n{{follow_up}}\n\nBest regards'
  },
  {
    id: 'thank_referral',
    name: 'Thank You (Referral)',
    description: 'Thank someone for a referral',
    category: 'thanks',
    template: 'I wanted to thank you for referring me to {{contact_name}}.\n\n{{outcome}}\n\nI really appreciate you thinking of me.\n\nBest regards'
  },

  // === DECLINES & APOLOGIES ===
  {
    id: 'decline_polite',
    name: 'Polite Decline',
    description: 'Politely decline a request',
    category: 'declines',
    template: 'Thank you for thinking of me for {{request}}.\n\nUnfortunately, {{reason}}, so I won\'t be able to participate at this time.\n\n{{alternative}}\n\nI appreciate your understanding.'
  },
  {
    id: 'apology',
    name: 'Apology',
    description: 'Apologize for an issue or delay',
    category: 'declines',
    template: 'I want to sincerely apologize for {{issue}}.\n\n{{explanation}}\n\nTo make this right, {{resolution}}.\n\nThank you for your patience and understanding.'
  },
  {
    id: 'delay_notice',
    name: 'Delay Notice',
    description: 'Notify about a delay',
    category: 'declines',
    template: 'I wanted to let you know that {{item}} will be delayed.\n\nThe new expected {{timeframe}} is {{new_date}}.\n\n{{reason}}\n\n{{mitigation}}\n\nApologies for any inconvenience.'
  },

  // === OUT OF OFFICE ===
  {
    id: 'out_of_office',
    name: 'Out of Office',
    description: 'Let someone know you are away',
    category: 'ooo',
    template: 'Thank you for your email. I am currently {{status}} and will have limited access to email until {{return_date}}.\n\n{{urgent_contact}}\n\nI will respond to your email upon my return.\n\nBest regards'
  },
  {
    id: 'vacation_handoff',
    name: 'Vacation Handoff',
    description: 'Hand off responsibilities while away',
    category: 'ooo',
    template: 'I will be out of office from {{start_date}} to {{end_date}}.\n\nDuring this time, {{backup_person}} will be handling {{responsibilities}}.\n\nFor urgent matters, please contact them at {{contact_info}}.\n\nThank you for your understanding.'
  },

  // === INTRODUCTIONS ===
  {
    id: 'introduction',
    name: 'Self Introduction',
    description: 'Introduce yourself',
    category: 'introductions',
    template: 'Thank you for connecting. {{intro}}\n\n{{background}}\n\n{{call_to_action}}\n\nBest regards'
  },
  {
    id: 'intro_connection',
    name: 'Introduce Two People',
    description: 'Connect two people via email',
    category: 'introductions',
    template: 'I\'d like to introduce you both.\n\n{{person1}}, meet {{person2}}. {{person2_background}}\n\n{{person2}}, {{person1}} is {{person1_background}}\n\nI thought you two should connect because {{reason}}.\n\nI\'ll let you take it from here!'
  },
  {
    id: 'intro_cold',
    name: 'Cold Outreach',
    description: 'Reach out to someone new',
    category: 'introductions',
    template: 'I hope this email finds you well. My name is {{your_name}} and I\'m {{your_role}}.\n\nI\'m reaching out because {{reason}}.\n\n{{value_proposition}}\n\nWould you be open to {{call_to_action}}?\n\nBest regards'
  },

  // === STATUS UPDATES ===
  {
    id: 'status_update',
    name: 'Project Status Update',
    description: 'Provide a status update on a project',
    category: 'updates',
    template: 'Here\'s a status update on {{project}}:\n\n**Completed:**\n{{completed_items}}\n\n**In Progress:**\n{{in_progress}}\n\n**Next Steps:**\n{{next_steps}}\n\n**Blockers:**\n{{blockers}}\n\nPlease let me know if you have any questions.'
  },
  {
    id: 'weekly_update',
    name: 'Weekly Update',
    description: 'Weekly summary email',
    category: 'updates',
    template: 'Here\'s my weekly update for {{week}}:\n\n**Highlights:**\n{{highlights}}\n\n**Challenges:**\n{{challenges}}\n\n**Next Week\'s Focus:**\n{{next_week}}\n\nLet me know if you\'d like more details on anything.'
  },

  // === FEEDBACK ===
  {
    id: 'feedback_positive',
    name: 'Positive Feedback',
    description: 'Share positive feedback',
    category: 'feedback',
    template: 'I wanted to share some positive feedback about {{subject}}.\n\n{{specific_praise}}\n\n{{impact}}\n\nGreat work!'
  },
  {
    id: 'feedback_constructive',
    name: 'Constructive Feedback',
    description: 'Share constructive criticism',
    category: 'feedback',
    template: 'I wanted to share some thoughts on {{subject}}.\n\n{{positive_aspect}}\n\nOne area for improvement: {{suggestion}}\n\n{{support_offer}}\n\nHappy to discuss further.'
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
