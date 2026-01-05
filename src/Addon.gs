/**
 * Gmail Add-on UI Components
 * Provides card-based interface for Claude AI email assistance
 */

// Logo URL for card headers
const LOGO_URL = 'https://raw.githubusercontent.com/siliconyouth/claude-for-gmail/main/assets/logo.png';

// ============================================================================
// TRIGGER HANDLERS
// ============================================================================

/**
 * Homepage trigger - shown when add-on is opened from sidebar
 * @param {Object} e - Event object
 * @returns {Card} The homepage card
 */
function onHomepage(e) {
  return buildHomepageCard();
}

/**
 * Contextual trigger - shown when viewing an email
 * @param {Object} e - Event object containing message metadata
 * @returns {Card} The contextual action card
 */
function onGmailMessage(e) {
  // Get the message ID from the event
  const messageId = e.gmail.messageId;

  if (!messageId) {
    return buildErrorCard('No email selected', 'Please open an email to use Claude.');
  }

  return buildEmailActionCard(messageId);
}

/**
 * Compose trigger - shown when composing a new email
 * @param {Object} e - Event object
 * @returns {Card} The compose assistance card
 */
function onCompose(e) {
  return buildComposeCard();
}

// ============================================================================
// CARD BUILDERS
// ============================================================================

/**
 * Build the homepage welcome card
 * @returns {Card}
 */
function buildHomepageCard() {
  const card = CardService.newCardBuilder();

  // Header
  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Claude for Gmail')
      .setSubtitle('AI-powered email assistance')
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(LOGO_URL)
  );

  // Welcome section
  const welcomeSection = CardService.newCardSection()
    .setHeader('Welcome')
    .addWidget(
      CardService.newTextParagraph()
        .setText('Open an email to get started with AI-powered analysis.')
    );

  // Features section
  const featuresSection = CardService.newCardSection()
    .setHeader('Features')
    .addWidget(
      CardService.newDecoratedText()
        .setText('Summarize')
        .setBottomLabel('Get concise email summaries')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.DESCRIPTION))
    )
    .addWidget(
      CardService.newDecoratedText()
        .setText('Analyze')
        .setBottomLabel('Priority, sentiment, category')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
    )
    .addWidget(
      CardService.newDecoratedText()
        .setText('Draft Reply')
        .setBottomLabel('AI-generated response drafts')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.EMAIL))
    )
    .addWidget(
      CardService.newDecoratedText()
        .setText('Action Items')
        .setBottomLabel('Extract tasks and deadlines')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE))
    );

  // Status section
  const statusSection = CardService.newCardSection()
    .setHeader('Status');

  let apiKeyStatus = 'Not Set';
  let apiKeyOk = false;

  try {
    // Direct access to avoid any wrapper issues
    const props = PropertiesService.getScriptProperties();
    const apiKey = props.getProperty('CLAUDE_API_KEY');
    if (apiKey && apiKey.length > 10) {
      apiKeyStatus = 'Connected';
      apiKeyOk = true;
    }
  } catch (error) {
    // Log for debugging
    Logger.log('API key check error: ' + error.message);
  }

  const statusWidget = CardService.newDecoratedText()
    .setText(apiKeyOk ? 'API: ' + apiKeyStatus : 'API Key Not Set')
    .setStartIcon(CardService.newIconImage().setIcon(apiKeyOk ? CardService.Icon.CONFIRM : CardService.Icon.NONE));

  if (!apiKeyOk) {
    statusWidget.setBottomLabel('Go to Project Settings → Script Properties');
  }

  statusSection.addWidget(statusWidget);

  // Settings button
  const settingsAction = CardService.newAction()
    .setFunctionName('onOpenSettings');

  statusSection.addWidget(
    CardService.newDecoratedText()
      .setText('Settings')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE))
      .setOnClickAction(settingsAction)
  );

  // Automation section
  const automationSection = CardService.newCardSection()
    .setHeader('Automation');

  // Daily digest toggle
  const digestAction = CardService.newAction()
    .setFunctionName('onToggleDigest');

  automationSection.addWidget(
    CardService.newDecoratedText()
      .setText('Daily Digest')
      .setBottomLabel('Morning summary at 8 AM')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.EMAIL))
      .setSwitchControl(
        CardService.newSwitch()
          .setFieldName('digestEnabled')
          .setValue('true')
          .setOnChangeAction(digestAction)
          .setSelected(isDigestEnabled())
      )
  );

  // Auto-label toggle
  const autoLabelAction = CardService.newAction()
    .setFunctionName('onToggleAutoLabel');

  automationSection.addWidget(
    CardService.newDecoratedText()
      .setText('Auto-Label Emails')
      .setBottomLabel('Smart categorization every hour')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
      .setSwitchControl(
        CardService.newSwitch()
          .setFieldName('autoLabelEnabled')
          .setValue('true')
          .setOnChangeAction(autoLabelAction)
          .setSelected(isAutoLabelEnabled())
      )
  );

  // Send digest now button (with loading spinner)
  const sendDigestAction = CardService.newAction()
    .setFunctionName('onSendDigestNow')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  automationSection.addWidget(
    CardService.newTextButton()
      .setText('Send Digest Now')
      .setOnClickAction(sendDigestAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  card.addSection(welcomeSection);
  card.addSection(featuresSection);
  card.addSection(automationSection);
  card.addSection(statusSection);

  return card.build();
}

/**
 * Build the email action card (shown when viewing an email)
 * @param {string} messageId - The Gmail message ID
 * @returns {Card}
 */
function buildEmailActionCard(messageId) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Claude for Gmail')
      .setSubtitle('Click an action below')
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(LOGO_URL)
  );

  // Quick actions section
  const actionsSection = CardService.newCardSection()
    .setHeader('Quick Actions');

  // Analyze button (with loading spinner)
  const analyzeAction = CardService.newAction()
    .setFunctionName('onAnalyzeEmail')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Analyze Email')
      .setOnClickAction(analyzeAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  // Draft reply button (with loading spinner)
  const draftAction = CardService.newAction()
    .setFunctionName('onDraftReplyStart')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Draft Reply')
      .setOnClickAction(draftAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  // Extract actions button (with loading spinner)
  const extractAction = CardService.newAction()
    .setFunctionName('onExtractActions')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Extract Action Items')
      .setOnClickAction(extractAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  // Full analysis button (with loading spinner)
  const fullAnalysisAction = CardService.newAction()
    .setFunctionName('onFullAnalysis')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Full Analysis')
      .setOnClickAction(fullAnalysisAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  card.addSection(actionsSection);

  // Templates section
  const templatesSection = CardService.newCardSection()
    .setHeader('Quick Templates');

  const templateAction = CardService.newAction()
    .setFunctionName('onShowTemplates')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  templatesSection.addWidget(
    CardService.newDecoratedText()
      .setText('Use Template')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.DESCRIPTION))
      .setOnClickAction(templateAction)
  );

  // Smart label button (with loading spinner)
  const labelAction = CardService.newAction()
    .setFunctionName('onApplySmartLabels')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  templatesSection.addWidget(
    CardService.newDecoratedText()
      .setText('Apply Smart Labels')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
      .setOnClickAction(labelAction)
  );

  card.addSection(templatesSection);

  return card.build();
}

/**
 * Build the compose assistance card
 * @returns {Card}
 */
function buildComposeCard() {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Draft with Claude')
      .setSubtitle('AI writing assistance')
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(LOGO_URL)
  );

  const section = CardService.newCardSection()
    .addWidget(
      CardService.newTextParagraph()
        .setText('Compose assistance coming soon. Use "Draft Reply" when viewing an email.')
    );

  card.addSection(section);

  return card.build();
}

/**
 * Build an error card
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {Card}
 */
function buildErrorCard(title, message) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle(title)
  );

  const section = CardService.newCardSection()
    .addWidget(
      CardService.newTextParagraph()
        .setText(message)
    );

  card.addSection(section);

  return card.build();
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

/**
 * Handle the Analyze Email button click
 * @param {Object} e - Event object with parameters
 * @returns {ActionResponse}
 */
function onAnalyzeEmail(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = validateAndGetMessage(messageId);
    const body = getEmailBody(message);
    const metadata = getEmailMetadata(message);

    // Get summary (with caching)
    const summary = summarizeEmail(body, messageId);

    // Build result card
    const card = buildSummaryResultCard(metadata, summary, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onAnalyzeEmail', error);
    const parsed = parseError(error);
    const errorCard = buildErrorCard('Analysis Failed', parsed.message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(errorCard))
      .build();
  }
}

/**
 * Handle the Draft Reply button click - show options
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onDraftReplyStart(e) {
  const messageId = e.parameters.messageId;
  const card = buildDraftOptionsCard(messageId);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Generate the draft reply
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onGenerateDraft(e) {
  const messageId = e.parameters.messageId;
  const tone = e.formInput?.tone?.[0] || e.parameters.tone || 'professional';
  const customInstructions = e.formInput?.customInstructions || '';

  try {
    const message = validateAndGetMessage(messageId);
    const body = getEmailBody(message);

    let instructions = `Tone: ${tone}`;
    if (customInstructions) {
      instructions += `. Additional instructions: ${customInstructions}`;
    }

    const replyText = generateReply(body, instructions);
    const draft = createReplyDraft(message, replyText);

    const card = buildDraftResultCard(replyText, draft.getId(), messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onGenerateDraft', error);
    const parsed = parseError(error);
    const errorCard = buildErrorCard('Draft Failed', parsed.message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(errorCard))
      .build();
  }
}

/**
 * Handle Extract Action Items button
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onExtractActions(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = validateAndGetMessage(messageId);
    const body = getEmailBody(message);

    // Extract with caching
    const actionItems = extractActionItems(body, messageId);
    const card = buildActionItemsCard(actionItems, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onExtractActions', error);
    const parsed = parseError(error);
    const errorCard = buildErrorCard('Extraction Failed', parsed.message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(errorCard))
      .build();
  }
}

/**
 * Handle Full Analysis button (summary + analysis + action items)
 * Uses single API call for efficiency
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onFullAnalysis(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = validateAndGetMessage(messageId);
    const body = getEmailBody(message);
    const metadata = getEmailMetadata(message);

    // Single API call for all analyses (more efficient)
    const fullResult = fullEmailAnalysis(body, messageId);

    const card = buildFullAnalysisCard(
      metadata,
      fullResult.summary,
      fullResult.analysis,
      fullResult.actionItems,
      messageId
    );

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onFullAnalysis', error);
    const parsed = parseError(error);
    const errorCard = buildErrorCard('Analysis Failed', parsed.message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(errorCard))
      .build();
  }
}

// ============================================================================
// RESULT CARD BUILDERS
// ============================================================================

/**
 * Build summary result card
 * @param {Object} metadata - Email metadata
 * @param {string} summary - The AI summary
 * @param {string} messageId - Message ID for follow-up actions
 * @returns {Card}
 */
function buildSummaryResultCard(metadata, summary, messageId) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Email Summary')
      .setSubtitle(truncateText(metadata.subject, 40))
  );

  // Summary section
  const summarySection = CardService.newCardSection()
    .setHeader('Summary')
    .addWidget(
      CardService.newTextParagraph()
        .setText(summary)
    );

  card.addSection(summarySection);

  // Actions section
  const actionsSection = CardService.newCardSection();

  const draftAction = CardService.newAction()
    .setFunctionName('onDraftReplyStart')
    .setParameters({ messageId: messageId });

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Draft Reply')
      .setOnClickAction(draftAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  const fullAction = CardService.newAction()
    .setFunctionName('onFullAnalysis')
    .setParameters({ messageId: messageId });

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Full Analysis')
      .setOnClickAction(fullAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  card.addSection(actionsSection);

  return card.build();
}

/**
 * Build draft options card
 * @param {string} messageId - Message ID
 * @returns {Card}
 */
function buildDraftOptionsCard(messageId) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Draft Reply')
      .setSubtitle('Choose tone and style')
  );

  const section = CardService.newCardSection();

  // Tone selection
  section.addWidget(
    CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.RADIO_BUTTON)
      .setFieldName('tone')
      .setTitle('Tone')
      .addItem('Professional', 'professional', true)
      .addItem('Friendly', 'friendly', false)
      .addItem('Concise', 'concise', false)
      .addItem('Formal', 'formal', false)
  );

  // Custom instructions
  section.addWidget(
    CardService.newTextInput()
      .setFieldName('customInstructions')
      .setTitle('Additional Instructions (optional)')
      .setHint('e.g., "Decline politely" or "Ask for more details"')
  );

  // Generate button (with loading spinner)
  const generateAction = CardService.newAction()
    .setFunctionName('onGenerateDraft')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  section.addWidget(
    CardService.newTextButton()
      .setText('Generate Draft')
      .setOnClickAction(generateAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  card.addSection(section);

  return card.build();
}

/**
 * Build draft result card
 * @param {string} replyText - The generated reply
 * @param {string} draftId - The draft ID
 * @param {string} messageId - Original message ID
 * @returns {Card}
 */
function buildDraftResultCard(replyText, draftId, messageId) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Draft Created')
      .setSubtitle('Review in your Drafts folder')
  );

  // Draft preview section
  const previewText = replyText ? truncateText(replyText, 500) : 'Draft generated successfully.';
  const previewSection = CardService.newCardSection()
    .setHeader('Preview')
    .addWidget(
      CardService.newTextParagraph()
        .setText(previewText)
    );

  card.addSection(previewSection);

  // Success message
  const statusSection = CardService.newCardSection()
    .addWidget(
      CardService.newDecoratedText()
        .setText('Draft saved successfully')
        .setBottomLabel('Check your Drafts folder to review and send')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.CONFIRM))
    );

  // Regenerate option
  const regenerateAction = CardService.newAction()
    .setFunctionName('onDraftReplyStart')
    .setParameters({ messageId: messageId || '' });

  statusSection.addWidget(
    CardService.newTextButton()
      .setText('Try Different Options')
      .setOnClickAction(regenerateAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  card.addSection(statusSection);

  return card.build();
}

/**
 * Build action items card
 * @param {Object} actionItems - Extracted action items
 * @param {string} messageId - Message ID
 * @returns {Card}
 */
function buildActionItemsCard(actionItems, messageId) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Action Items')
      .setSubtitle('Extracted from email')
  );

  // Tasks section
  if (actionItems.tasks && actionItems.tasks.length > 0) {
    const tasksSection = CardService.newCardSection()
      .setHeader('Tasks');

    actionItems.tasks.forEach(function(task) {
      tasksSection.addWidget(
        CardService.newDecoratedText()
          .setText(task)
          .setWrapText(true)
          .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE))
      );
    });

    card.addSection(tasksSection);
  }

  // Deadlines section
  if (actionItems.deadlines && actionItems.deadlines.length > 0) {
    const deadlinesSection = CardService.newCardSection()
      .setHeader('Deadlines');

    actionItems.deadlines.forEach(function(deadline) {
      deadlinesSection.addWidget(
        CardService.newDecoratedText()
          .setText(deadline)
          .setWrapText(true)
          .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.CLOCK))
      );
    });

    card.addSection(deadlinesSection);
  }

  // Waiting on section
  if (actionItems.waitingOn && actionItems.waitingOn.length > 0) {
    const waitingSection = CardService.newCardSection()
      .setHeader('Waiting On');

    actionItems.waitingOn.forEach(function(item) {
      waitingSection.addWidget(
        CardService.newDecoratedText()
          .setText(item)
          .setWrapText(true)
          .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.PERSON))
      );
    });

    card.addSection(waitingSection);
  }

  // No items found
  if ((!actionItems.tasks || actionItems.tasks.length === 0) &&
      (!actionItems.deadlines || actionItems.deadlines.length === 0) &&
      (!actionItems.waitingOn || actionItems.waitingOn.length === 0)) {
    const emptySection = CardService.newCardSection()
      .addWidget(
        CardService.newTextParagraph()
          .setText('No action items found in this email.')
      );
    card.addSection(emptySection);
  }

  return card.build();
}

/**
 * Build full analysis card (combines all analyses)
 * @param {Object} metadata - Email metadata
 * @param {string} summary - Summary text
 * @param {Object} analysis - Analysis object
 * @param {Object} actionItems - Action items object
 * @param {string} messageId - Message ID
 * @returns {Card}
 */
function buildFullAnalysisCard(metadata, summary, analysis, actionItems, messageId) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Full Analysis')
      .setSubtitle(truncateText(metadata.subject, 40))
  );

  // Priority/Category badges
  const badgesSection = CardService.newCardSection();

  const priorityIcon = getPriorityIcon(analysis.priority);
  const sentimentIcon = getSentimentIcon(analysis.sentiment);

  badgesSection.addWidget(
    CardService.newDecoratedText()
      .setText(`Priority: ${analysis.priority?.toUpperCase() || 'Unknown'}`)
      .setStartIcon(CardService.newIconImage().setIcon(priorityIcon))
  );

  badgesSection.addWidget(
    CardService.newDecoratedText()
      .setText(`Sentiment: ${analysis.sentiment || 'Unknown'}`)
      .setStartIcon(CardService.newIconImage().setIcon(sentimentIcon))
  );

  if (analysis.category) {
    badgesSection.addWidget(
      CardService.newDecoratedText()
        .setText(`Category: ${analysis.category}`)
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
    );
  }

  card.addSection(badgesSection);

  // Summary section
  const summarySection = CardService.newCardSection()
    .setHeader('Summary')
    .addWidget(
      CardService.newTextParagraph()
        .setText(summary)
    );

  card.addSection(summarySection);

  // Action items section (compact)
  if (actionItems.tasks && actionItems.tasks.length > 0) {
    const actionsSection = CardService.newCardSection()
      .setHeader('Action Items');

    actionItems.tasks.slice(0, 3).forEach(function(task) {
      actionsSection.addWidget(
        CardService.newDecoratedText()
          .setText(task)
          .setWrapText(true)
          .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE))
      );
    });

    if (actionItems.tasks.length > 3) {
      actionsSection.addWidget(
        CardService.newTextParagraph()
          .setText(`+ ${actionItems.tasks.length - 3} more...`)
      );
    }

    card.addSection(actionsSection);
  }

  // Draft reply button
  const buttonSection = CardService.newCardSection();

  const draftAction = CardService.newAction()
    .setFunctionName('onDraftReplyStart')
    .setParameters({ messageId: messageId });

  buttonSection.addWidget(
    CardService.newTextButton()
      .setText('Draft Reply')
      .setOnClickAction(draftAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  card.addSection(buttonSection);

  return card.build();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string}
 */
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Get icon for priority level
 * @param {string} priority - Priority level
 * @returns {Icon}
 */
function getPriorityIcon(priority) {
  switch (priority?.toLowerCase()) {
    case 'high':
      return CardService.Icon.STAR;
    case 'medium':
      return CardService.Icon.BOOKMARK;
    case 'low':
      return CardService.Icon.NONE;
    default:
      return CardService.Icon.NONE;
  }
}

/**
 * Get icon for sentiment
 * @param {string} sentiment - Sentiment value
 * @returns {Icon}
 */
function getSentimentIcon(sentiment) {
  switch (sentiment?.toLowerCase()) {
    case 'positive':
      return CardService.Icon.CONFIRM;
    case 'negative':
      return CardService.Icon.NONE;
    case 'neutral':
      return CardService.Icon.DESCRIPTION;
    default:
      return CardService.Icon.DESCRIPTION;
  }
}

// ============================================================================
// AUTOMATION HANDLERS
// ============================================================================

/**
 * Check if digest is enabled (uses unified scheduler)
 * @returns {boolean}
 */
function isDigestEnabled() {
  return getPreference(PREF_DIGEST_ENABLED, false);
}

/**
 * Check if auto-label is enabled (uses unified scheduler)
 * @returns {boolean}
 */
function isAutoLabelEnabled() {
  return getPreference(PREF_AUTO_LABEL_ENABLED, false);
}

/**
 * Toggle daily digest (uses unified scheduler)
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onToggleDigest(e) {
  try {
    const enabled = e.formInputs?.digestEnabled?.[0] === 'true';

    if (enabled) {
      enableDigest(8); // 8 AM default
    } else {
      disableDigest();
    }

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText(enabled ? 'Daily digest enabled (8 AM)' : 'Daily digest disabled')
      )
      .build();
  } catch (error) {
    logError('onToggleDigest', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Error: ' + parseError(error).message)
      )
      .build();
  }
}

/**
 * Toggle auto-labeling (uses unified scheduler)
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onToggleAutoLabel(e) {
  try {
    const enabled = e.formInputs?.autoLabelEnabled?.[0] === 'true';

    if (enabled) {
      initializeLabels();
      enableAutoLabel();
    } else {
      disableAutoLabel();
    }

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText(enabled ? 'Auto-labeling enabled (hourly)' : 'Auto-labeling disabled')
      )
      .build();
  } catch (error) {
    logError('onToggleAutoLabel', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Error: ' + parseError(error).message)
      )
      .build();
  }
}

/**
 * Send digest immediately (preview, doesn't affect scheduled digest)
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onSendDigestNow(e) {
  try {
    sendDailyDigest();
    // Note: Does NOT mark timestamp - only scheduled digest does
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Digest sent! Check your inbox.')
      )
      .build();
  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Error: ' + error.message)
      )
      .build();
  }
}

// ============================================================================
// TEMPLATE HANDLERS
// ============================================================================

/**
 * Show template selection card
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onShowTemplates(e) {
  const messageId = e.parameters.messageId;
  const card = buildTemplateSelectionCard(messageId);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Build template selection card
 * @param {string} messageId - Message ID
 * @returns {Card}
 */
function buildTemplateSelectionCard(messageId) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Select Template')
      .setSubtitle('Choose a reply template')
  );

  const templates = getTemplates();
  const section = CardService.newCardSection();

  templates.forEach(function(template) {
    const action = CardService.newAction()
      .setFunctionName('onApplyTemplate')
      .setParameters({ messageId: messageId, templateId: template.id });

    section.addWidget(
      CardService.newDecoratedText()
        .setText(template.name)
        .setBottomLabel(template.description)
        .setOnClickAction(action)
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.DESCRIPTION))
    );
  });

  card.addSection(section);

  return card.build();
}

/**
 * Apply a template to create a draft
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onApplyTemplate(e) {
  const messageId = e.parameters.messageId;
  const templateId = e.parameters.templateId;

  try {
    const result = applyTemplateToEmail(messageId, templateId, '');
    const card = buildDraftResultCard(result.content, result.draftId, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    Logger.log('Template error: ' + error.message);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Error: ' + error.message)
      )
      .build();
  }
}

// ============================================================================
// SMART LABEL HANDLERS
// ============================================================================

/**
 * Apply smart labels to current email
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onApplySmartLabels(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = GmailApp.getMessageById(messageId);
    const result = applySmartLabels(message, true);

    const labelsApplied = result.labels.map(l => l.split('/').pop()).join(', ');

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText(`Labels applied: ${labelsApplied}`)
      )
      .build();

  } catch (error) {
    Logger.log('Label error: ' + error.message);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Error: ' + error.message)
      )
      .build();
  }
}

// ============================================================================
// SETTINGS HANDLERS
// ============================================================================

/**
 * Open settings card
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onOpenSettings(e) {
  const card = buildSettingsCard();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Build the settings card
 * @returns {Card}
 */
function buildSettingsCard() {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Settings')
      .setSubtitle('Customize your experience')
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(LOGO_URL)
  );

  // Reply settings section
  const replySection = CardService.newCardSection()
    .setHeader('Reply Defaults');

  // Tone dropdown
  const currentTone = getPreference(PREF_REPLY_TONE, DEFAULT_REPLY_TONE);
  const toneDropdown = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('replyTone')
    .setTitle('Default Tone');

  TONE_OPTIONS.forEach(function(option) {
    toneDropdown.addItem(option.label, option.value, option.value === currentTone);
  });

  replySection.addWidget(toneDropdown);

  // Length dropdown
  const currentLength = getPreference(PREF_REPLY_LENGTH, DEFAULT_REPLY_LENGTH);
  const lengthDropdown = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('replyLength')
    .setTitle('Default Length');

  LENGTH_OPTIONS.forEach(function(option) {
    lengthDropdown.addItem(option.label, option.value, option.value === currentLength);
  });

  replySection.addWidget(lengthDropdown);

  // Include greeting checkbox
  const includeGreeting = getPreference(PREF_INCLUDE_GREETING, DEFAULT_INCLUDE_GREETING);
  replySection.addWidget(
    CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('includeGreeting')
      .addItem('Include greeting (Hi/Hello)', 'true', includeGreeting)
  );

  // Include signature checkbox
  const includeSignature = getPreference(PREF_INCLUDE_SIGNATURE, DEFAULT_INCLUDE_SIGNATURE);
  replySection.addWidget(
    CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('includeSignature')
      .addItem('Include signature', 'true', includeSignature)
  );

  // Custom signature
  const signatureText = getPreference(PREF_SIGNATURE_TEXT, DEFAULT_SIGNATURE_TEXT);
  replySection.addWidget(
    CardService.newTextInput()
      .setFieldName('signatureText')
      .setTitle('Custom Signature')
      .setHint('e.g., Best regards, John')
      .setValue(signatureText)
  );

  card.addSection(replySection);

  // Digest settings section
  const digestSection = CardService.newCardSection()
    .setHeader('Daily Digest');

  // Digest hour dropdown
  const currentHour = getPreference(PREF_DIGEST_HOUR, 8);
  const hourDropdown = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('digestHour')
    .setTitle('Send Time');

  DIGEST_HOUR_OPTIONS.forEach(function(option) {
    hourDropdown.addItem(option.label, String(option.value), option.value === currentHour);
  });

  digestSection.addWidget(hourDropdown);

  card.addSection(digestSection);

  // Save button section
  const saveSection = CardService.newCardSection();

  const saveAction = CardService.newAction()
    .setFunctionName('onSaveSettings');

  saveSection.addWidget(
    CardService.newTextButton()
      .setText('Save Settings')
      .setOnClickAction(saveAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  card.addSection(saveSection);

  return card.build();
}

/**
 * Save settings
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onSaveSettings(e) {
  try {
    const formInputs = e.formInputs || {};

    // Save reply tone
    if (formInputs.replyTone) {
      setPreference(PREF_REPLY_TONE, formInputs.replyTone[0]);
    }

    // Save reply length
    if (formInputs.replyLength) {
      setPreference(PREF_REPLY_LENGTH, formInputs.replyLength[0]);
    }

    // Save include greeting
    const includeGreeting = formInputs.includeGreeting && formInputs.includeGreeting[0] === 'true';
    setPreference(PREF_INCLUDE_GREETING, includeGreeting);

    // Save include signature
    const includeSignature = formInputs.includeSignature && formInputs.includeSignature[0] === 'true';
    setPreference(PREF_INCLUDE_SIGNATURE, includeSignature);

    // Save signature text
    if (formInputs.signatureText) {
      setPreference(PREF_SIGNATURE_TEXT, formInputs.signatureText[0] || '');
    }

    // Save digest hour
    if (formInputs.digestHour) {
      const hour = parseInt(formInputs.digestHour[0], 10);
      setPreference(PREF_DIGEST_HOUR, hour);
    }

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Settings saved!')
      )
      .setNavigation(CardService.newNavigation().popCard())
      .build();

  } catch (error) {
    Logger.log('Save settings error: ' + error.message);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Error saving: ' + error.message)
      )
      .build();
  }
}
