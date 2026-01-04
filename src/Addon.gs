/**
 * Gmail Add-on UI Components
 * Provides card-based interface for Claude AI email assistance
 */

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
      .setImageUrl('https://www.gstatic.com/images/branding/product/2x/google_cloud_48dp.png')
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

  try {
    getApiKey();
    statusSection.addWidget(
      CardService.newDecoratedText()
        .setText('API Connected')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.CONFIRM))
    );
  } catch (error) {
    statusSection.addWidget(
      CardService.newDecoratedText()
        .setText('API Key Not Set')
        .setBottomLabel('Set in Project Settings → Script Properties')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.NONE))
    );
  }

  card.addSection(welcomeSection);
  card.addSection(featuresSection);
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
  );

  // Quick actions section
  const actionsSection = CardService.newCardSection()
    .setHeader('Quick Actions');

  // Analyze button
  const analyzeAction = CardService.newAction()
    .setFunctionName('onAnalyzeEmail')
    .setParameters({ messageId: messageId });

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('🔍 Analyze Email')
      .setOnClickAction(analyzeAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  // Draft reply button
  const draftAction = CardService.newAction()
    .setFunctionName('onDraftReplyStart')
    .setParameters({ messageId: messageId });

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('📝 Draft Reply')
      .setOnClickAction(draftAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  // Extract actions button
  const extractAction = CardService.newAction()
    .setFunctionName('onExtractActions')
    .setParameters({ messageId: messageId });

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('✅ Extract Action Items')
      .setOnClickAction(extractAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  // Full analysis button
  const fullAnalysisAction = CardService.newAction()
    .setFunctionName('onFullAnalysis')
    .setParameters({ messageId: messageId });

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('📊 Full Analysis')
      .setOnClickAction(fullAnalysisAction)
      .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
  );

  card.addSection(actionsSection);

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
    const message = GmailApp.getMessageById(messageId);
    const body = getEmailBody(message);
    const metadata = getEmailMetadata(message);

    // Get summary
    const summary = summarizeEmail(body);

    // Build result card
    const card = buildSummaryResultCard(metadata, summary, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    Logger.log('Analysis error: ' + error.message);
    const errorCard = buildErrorCard('Analysis Failed', error.message);
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
  const tone = e.parameters.tone || 'professional';
  const customInstructions = e.formInput?.customInstructions || '';

  try {
    const message = GmailApp.getMessageById(messageId);
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
    Logger.log('Draft error: ' + error.message);
    const errorCard = buildErrorCard('Draft Failed', error.message);
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
    const message = GmailApp.getMessageById(messageId);
    const body = getEmailBody(message);

    const actionItems = extractActionItems(body);
    const card = buildActionItemsCard(actionItems, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    Logger.log('Extract error: ' + error.message);
    const errorCard = buildErrorCard('Extraction Failed', error.message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(errorCard))
      .build();
  }
}

/**
 * Handle Full Analysis button (summary + analysis + action items)
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onFullAnalysis(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = GmailApp.getMessageById(messageId);
    const body = getEmailBody(message);
    const metadata = getEmailMetadata(message);

    // Run all analyses
    const summary = summarizeEmail(body);
    const analysis = analyzeEmail(body);
    const actionItems = extractActionItems(body);

    const card = buildFullAnalysisCard(metadata, summary, analysis, actionItems, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    Logger.log('Full analysis error: ' + error.message);
    const errorCard = buildErrorCard('Analysis Failed', error.message);
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
      .setText('📝 Draft Reply')
      .setOnClickAction(draftAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  const fullAction = CardService.newAction()
    .setFunctionName('onFullAnalysis')
    .setParameters({ messageId: messageId });

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('📊 Full Analysis')
      .setOnClickAction(fullAction)
      .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
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

  // Generate button
  const generateAction = CardService.newAction()
    .setFunctionName('onGenerateDraft')
    .setParameters({ messageId: messageId });

  section.addWidget(
    CardService.newTextButton()
      .setText('✨ Generate Draft')
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
  const previewSection = CardService.newCardSection()
    .setHeader('Preview')
    .addWidget(
      CardService.newTextParagraph()
        .setText(truncateText(replyText, 500))
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
    .setParameters({ messageId: messageId });

  statusSection.addWidget(
    CardService.newTextButton()
      .setText('🔄 Try Different Options')
      .setOnClickAction(regenerateAction)
      .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
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
      .setText('📝 Draft Reply')
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
