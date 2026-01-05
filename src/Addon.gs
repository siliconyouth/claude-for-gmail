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
  // Check if onboarding is needed
  if (needsOnboarding()) {
    return buildOnboardingCard();
  }
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

  if (apiKeyOk) {
    statusSection.addWidget(
      CardService.newDecoratedText()
        .setText('API: Connected')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR))
    );
  } else {
    statusSection.addWidget(
      CardService.newDecoratedText()
        .setText('API Key Not Set')
        .setBottomLabel('Go to Project Settings → Script Properties')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.EMAIL))
    );
  }

  // Settings button
  const settingsAction = CardService.newAction()
    .setFunctionName('onOpenSettings');

  statusSection.addWidget(
    CardService.newDecoratedText()
      .setText('Settings')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE))
      .setOnClickAction(settingsAction)
  );

  // Dashboard section - Priority Inbox
  const dashboardSection = CardService.newCardSection()
    .setHeader('Dashboard');

  const priorityAction = CardService.newAction()
    .setFunctionName('onShowPriorityInbox')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  dashboardSection.addWidget(
    CardService.newDecoratedText()
      .setText('Priority Inbox')
      .setBottomLabel('AI-sorted by importance')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR))
      .setOnClickAction(priorityAction)
  );

  // Scheduled emails count
  const scheduledEmails = getScheduledEmails();
  const scheduledAction = CardService.newAction()
    .setFunctionName('onShowScheduledEmails');

  dashboardSection.addWidget(
    CardService.newDecoratedText()
      .setText('Scheduled Emails')
      .setBottomLabel(scheduledEmails.length + ' pending')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.CLOCK))
      .setOnClickAction(scheduledAction)
  );

  // Snoozed emails count
  const snoozedEmails = getSnoozedEmails();
  const snoozedAction = CardService.newAction()
    .setFunctionName('onShowSnoozedEmails');

  dashboardSection.addWidget(
    CardService.newDecoratedText()
      .setText('Snoozed Emails')
      .setBottomLabel(snoozedEmails.length + ' reminders')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE))
      .setOnClickAction(snoozedAction)
  );

  // Usage stats
  const statsAction = CardService.newAction()
    .setFunctionName('onShowUsageStats');

  dashboardSection.addWidget(
    CardService.newDecoratedText()
      .setText('Usage Stats')
      .setBottomLabel('View your productivity insights')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
      .setOnClickAction(statsAction)
  );

  // Automation section
  const automationSection = CardService.newCardSection()
    .setHeader('Automation')
    .setCollapsible(true);

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

  // Bulk Actions section
  const bulkSection = CardService.newCardSection()
    .setHeader('Bulk Actions')
    .setCollapsible(true);

  // Scan inbox for threats
  const scanInboxAction = CardService.newAction()
    .setFunctionName('onBulkSecurityScan')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  bulkSection.addWidget(
    CardService.newDecoratedText()
      .setText('Scan Inbox for Threats')
      .setBottomLabel('Check recent emails for spam/phishing')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR))
      .setOnClickAction(scanInboxAction)
  );

  // Bulk archive old emails
  const bulkArchiveAction = CardService.newAction()
    .setFunctionName('onBulkArchiveOld')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  bulkSection.addWidget(
    CardService.newDecoratedText()
      .setText('Archive Old Emails')
      .setBottomLabel('Archive emails older than 30 days')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
      .setOnClickAction(bulkArchiveAction)
  );

  // Mark all as read
  const markAllReadAction = CardService.newAction()
    .setFunctionName('onBulkMarkRead')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  bulkSection.addWidget(
    CardService.newDecoratedText()
      .setText('Mark All as Read')
      .setBottomLabel('Mark all inbox emails as read')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.EMAIL))
      .setOnClickAction(markAllReadAction)
  );

  // View inbox summary
  const inboxSummaryAction = CardService.newAction()
    .setFunctionName('onShowInboxSummary')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  bulkSection.addWidget(
    CardService.newDecoratedText()
      .setText('Inbox Summary')
      .setBottomLabel('View inbox statistics')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.DESCRIPTION))
      .setOnClickAction(inboxSummaryAction)
  );

  card.addSection(welcomeSection);
  card.addSection(dashboardSection);
  card.addSection(featuresSection);
  card.addSection(bulkSection);
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

  // Advanced Features section
  const advancedSection = CardService.newCardSection()
    .setHeader('Advanced');

  // Thread Analysis
  const threadAction = CardService.newAction()
    .setFunctionName('onAnalyzeThread')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  advancedSection.addWidget(
    CardService.newDecoratedText()
      .setText('Analyze Thread')
      .setBottomLabel('Summarize entire conversation')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.EMAIL))
      .setOnClickAction(threadAction)
  );

  // Language & Translation
  const languageAction = CardService.newAction()
    .setFunctionName('onShowLanguageOptions')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  advancedSection.addWidget(
    CardService.newDecoratedText()
      .setText('Translate')
      .setBottomLabel('Detect language, translate email')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.PERSON))
      .setOnClickAction(languageAction)
  );

  // Follow-up Detection
  const followUpAction = CardService.newAction()
    .setFunctionName('onAnalyzeFollowUp')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  advancedSection.addWidget(
    CardService.newDecoratedText()
      .setText('Follow-up Check')
      .setBottomLabel('Does this need a response?')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.CLOCK))
      .setOnClickAction(followUpAction)
  );

  // Meeting Detection
  const meetingAction = CardService.newAction()
    .setFunctionName('onDetectMeeting')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  advancedSection.addWidget(
    CardService.newDecoratedText()
      .setText('Detect Meeting')
      .setBottomLabel('Extract event details')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE))
      .setOnClickAction(meetingAction)
  );

  card.addSection(advancedSection);

  // Templates section
  const templatesSection = CardService.newCardSection()
    .setHeader('More');

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

  // Security section
  const securitySection = CardService.newCardSection()
    .setHeader('Security')
    .setCollapsible(true);

  // Quick security scan
  const quickScanAction = CardService.newAction()
    .setFunctionName('onQuickSecurityScan')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  securitySection.addWidget(
    CardService.newDecoratedText()
      .setText('Quick Security Check')
      .setBottomLabel('Fast pattern-based scan')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR))
      .setOnClickAction(quickScanAction)
  );

  // Full AI security scan
  const fullScanAction = CardService.newAction()
    .setFunctionName('onFullSecurityScan')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  securitySection.addWidget(
    CardService.newDecoratedText()
      .setText('AI Security Analysis')
      .setBottomLabel('Deep scan for phishing/scam')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
      .setOnClickAction(fullScanAction)
  );

  // Report as phishing
  const reportPhishingAction = CardService.newAction()
    .setFunctionName('onReportPhishing')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  securitySection.addWidget(
    CardService.newDecoratedText()
      .setText('Report Phishing')
      .setBottomLabel('Move to spam & report')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.NONE))
      .setOnClickAction(reportPhishingAction)
  );

  // Report as spam
  const reportSpamAction = CardService.newAction()
    .setFunctionName('onReportSpam')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  securitySection.addWidget(
    CardService.newDecoratedText()
      .setText('Report Spam')
      .setBottomLabel('Move to spam folder')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.NONE))
      .setOnClickAction(reportSpamAction)
  );

  card.addSection(securitySection);

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

  // Smart compose suggestions
  const composeSection = CardService.newCardSection()
    .setHeader('Writing Assistance');

  // Improve writing
  composeSection.addWidget(
    CardService.newTextInput()
      .setFieldName('draftText')
      .setTitle('Enter your draft text')
      .setHint('Type or paste your draft here...')
      .setMultiline(true)
  );

  const improveAction = CardService.newAction()
    .setFunctionName('onImproveWriting')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  composeSection.addWidget(
    CardService.newTextButton()
      .setText('Improve Writing')
      .setOnClickAction(improveAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  const toneCheckAction = CardService.newAction()
    .setFunctionName('onCheckTone')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  composeSection.addWidget(
    CardService.newTextButton()
      .setText('Check Tone')
      .setOnClickAction(toneCheckAction)
  );

  card.addSection(composeSection);

  // Subject line suggestions
  const subjectSection = CardService.newCardSection()
    .setHeader('Subject Line');

  const subjectAction = CardService.newAction()
    .setFunctionName('onSuggestSubject')
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  subjectSection.addWidget(
    CardService.newTextButton()
      .setText('Suggest Subject Lines')
      .setOnClickAction(subjectAction)
  );

  card.addSection(subjectSection);

  // Templates
  const templateSection = CardService.newCardSection()
    .setHeader('Start From Template');

  const templateAction = CardService.newAction()
    .setFunctionName('onShowComposeTemplates');

  templateSection.addWidget(
    CardService.newDecoratedText()
      .setText('Browse Templates')
      .setBottomLabel('25+ professional templates')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.DESCRIPTION))
      .setOnClickAction(templateAction)
  );

  card.addSection(templateSection);

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
      return CardService.Icon.DESCRIPTION;
    default:
      return CardService.Icon.DESCRIPTION;
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
      return CardService.Icon.STAR;
    case 'negative':
      return CardService.Icon.EMAIL;
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

// ============================================================================
// ADVANCED FEATURE HANDLERS
// ============================================================================

/**
 * Handle Thread Analysis button
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onAnalyzeThread(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = validateAndGetMessage(messageId);
    const result = analyzeThread(message);
    const card = buildThreadAnalysisCard(result, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onAnalyzeThread', error);
    const errorCard = buildErrorCard('Thread Analysis Failed', parseError(error).message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(errorCard))
      .build();
  }
}

/**
 * Build thread analysis result card
 * @param {Object} result - Thread analysis result
 * @param {string} messageId - Message ID
 * @returns {Card}
 */
function buildThreadAnalysisCard(result, messageId) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Thread Analysis')
      .setSubtitle(result.messageCount + ' messages')
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(LOGO_URL)
  );

  // Summary section
  const summarySection = CardService.newCardSection()
    .setHeader('Summary')
    .addWidget(
      CardService.newTextParagraph()
        .setText(result.summary)
    );

  // Status badge
  summarySection.addWidget(
    CardService.newDecoratedText()
      .setText('Status: ' + (result.status || 'unknown').replace('_', ' '))
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
  );

  if (result.tone) {
    summarySection.addWidget(
      CardService.newDecoratedText()
        .setText('Tone: ' + result.tone)
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR))
    );
  }

  card.addSection(summarySection);

  // Decisions section
  if (result.decisions && result.decisions.length > 0) {
    const decisionsSection = CardService.newCardSection()
      .setHeader('Decisions Made');

    result.decisions.forEach(function(decision) {
      decisionsSection.addWidget(
        CardService.newDecoratedText()
          .setText(decision)
          .setWrapText(true)
          .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR))
      );
    });

    card.addSection(decisionsSection);
  }

  // Open questions section
  if (result.openQuestions && result.openQuestions.length > 0) {
    const questionsSection = CardService.newCardSection()
      .setHeader('Open Questions');

    result.openQuestions.forEach(function(question) {
      questionsSection.addWidget(
        CardService.newDecoratedText()
          .setText(question)
          .setWrapText(true)
          .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.DESCRIPTION))
      );
    });

    card.addSection(questionsSection);
  }

  // Next steps section
  if (result.nextSteps && result.nextSteps.length > 0) {
    const stepsSection = CardService.newCardSection()
      .setHeader('Next Steps');

    result.nextSteps.forEach(function(step) {
      stepsSection.addWidget(
        CardService.newDecoratedText()
          .setText(step)
          .setWrapText(true)
          .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE))
      );
    });

    card.addSection(stepsSection);
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

/**
 * Show language options card
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onShowLanguageOptions(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = validateAndGetMessage(messageId);
    const body = getEmailBody(message);
    const detected = detectLanguage(body);
    const card = buildLanguageOptionsCard(detected, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onShowLanguageOptions', error);
    const errorCard = buildErrorCard('Language Detection Failed', parseError(error).message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(errorCard))
      .build();
  }
}

/**
 * Build language options card with all Google Translate languages
 * @param {Object} detected - Detected language info
 * @param {string} messageId - Message ID
 * @returns {Card}
 */
function buildLanguageOptionsCard(detected, messageId) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Language & Translation')
      .setSubtitle('Powered by Google Translate')
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(LOGO_URL)
  );

  // Detection result
  const detectionSection = CardService.newCardSection()
    .setHeader('Detected Language');

  detectionSection.addWidget(
    CardService.newDecoratedText()
      .setText(detected.languageName + ' (' + detected.language + ')')
      .setBottomLabel('Confidence: ' + detected.confidence)
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.PERSON))
  );

  if (detected.service) {
    detectionSection.addWidget(
      CardService.newTextParagraph()
        .setText('Service: ' + detected.service)
    );
  }

  card.addSection(detectionSection);

  // Quick translate section (common languages)
  const quickTranslateSection = CardService.newCardSection()
    .setHeader('Quick Translate');

  // Use common languages from Translation.gs
  const commonLangs = getCommonLanguages().slice(0, 12); // First 12 common languages

  commonLangs.forEach(function(lang) {
    if (lang.code !== detected.language) {
      const action = CardService.newAction()
        .setFunctionName('onTranslateEmail')
        .setParameters({ messageId: messageId, targetLanguage: lang.code })
        .setLoadIndicator(CardService.LoadIndicator.SPINNER);

      quickTranslateSection.addWidget(
        CardService.newDecoratedText()
          .setText(lang.name)
          .setOnClickAction(action)
          .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
      );
    }
  });

  // More languages button
  const moreLanguagesAction = CardService.newAction()
    .setFunctionName('onShowAllLanguages')
    .setParameters({ messageId: messageId, mode: 'translate' });

  quickTranslateSection.addWidget(
    CardService.newTextButton()
      .setText('More Languages (100+)')
      .setOnClickAction(moreLanguagesAction)
      .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
  );

  card.addSection(quickTranslateSection);

  // Quick reply in language
  const replySection = CardService.newCardSection()
    .setHeader('Reply In');

  const replyLangs = getCommonLanguages().slice(0, 6); // First 6 for reply

  replyLangs.forEach(function(lang) {
    const action = CardService.newAction()
      .setFunctionName('onReplyInLanguage')
      .setParameters({ messageId: messageId, language: lang.code })
      .setLoadIndicator(CardService.LoadIndicator.SPINNER);

    replySection.addWidget(
      CardService.newDecoratedText()
        .setText('Reply in ' + lang.name)
        .setOnClickAction(action)
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.EMAIL))
    );
  });

  // More languages for reply
  const moreReplyAction = CardService.newAction()
    .setFunctionName('onShowAllLanguages')
    .setParameters({ messageId: messageId, mode: 'reply' });

  replySection.addWidget(
    CardService.newTextButton()
      .setText('More Languages')
      .setOnClickAction(moreReplyAction)
      .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
  );

  card.addSection(replySection);

  return card.build();
}

/**
 * Show all available languages for selection
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onShowAllLanguages(e) {
  const messageId = e.parameters.messageId;
  const mode = e.parameters.mode; // 'translate' or 'reply'
  const card = buildAllLanguagesCard(messageId, mode);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

/**
 * Build card with all 100+ languages organized by region
 * @param {string} messageId - Message ID
 * @param {string} mode - 'translate' or 'reply'
 * @returns {Card}
 */
function buildAllLanguagesCard(messageId, mode) {
  const card = CardService.newCardBuilder();

  const title = mode === 'translate' ? 'Translate To' : 'Reply In';

  card.setHeader(
    CardService.newCardHeader()
      .setTitle(title)
      .setSubtitle('100+ languages available')
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(LOGO_URL)
  );

  // Get language families for organized display
  const families = getLanguageFamilies();

  // European languages
  const europeanSection = CardService.newCardSection()
    .setHeader('European Languages');

  families['European'].slice(0, 15).forEach(function(code) {
    const langName = getLanguageName(code);
    const action = CardService.newAction()
      .setFunctionName(mode === 'translate' ? 'onTranslateEmail' : 'onReplyInLanguage')
      .setParameters(mode === 'translate'
        ? { messageId: messageId, targetLanguage: code }
        : { messageId: messageId, language: code })
      .setLoadIndicator(CardService.LoadIndicator.SPINNER);

    europeanSection.addWidget(
      CardService.newDecoratedText()
        .setText(langName)
        .setOnClickAction(action)
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
    );
  });

  card.addSection(europeanSection);

  // Asian languages
  const asianSection = CardService.newCardSection()
    .setHeader('Asian Languages');

  families['Asian'].slice(0, 15).forEach(function(code) {
    const langName = getLanguageName(code);
    const action = CardService.newAction()
      .setFunctionName(mode === 'translate' ? 'onTranslateEmail' : 'onReplyInLanguage')
      .setParameters(mode === 'translate'
        ? { messageId: messageId, targetLanguage: code }
        : { messageId: messageId, language: code })
      .setLoadIndicator(CardService.LoadIndicator.SPINNER);

    asianSection.addWidget(
      CardService.newDecoratedText()
        .setText(langName)
        .setOnClickAction(action)
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
    );
  });

  card.addSection(asianSection);

  // Middle Eastern languages
  const middleEastSection = CardService.newCardSection()
    .setHeader('Middle Eastern');

  families['Middle Eastern'].forEach(function(code) {
    const langName = getLanguageName(code);
    const action = CardService.newAction()
      .setFunctionName(mode === 'translate' ? 'onTranslateEmail' : 'onReplyInLanguage')
      .setParameters(mode === 'translate'
        ? { messageId: messageId, targetLanguage: code }
        : { messageId: messageId, language: code })
      .setLoadIndicator(CardService.LoadIndicator.SPINNER);

    middleEastSection.addWidget(
      CardService.newDecoratedText()
        .setText(langName)
        .setOnClickAction(action)
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
    );
  });

  card.addSection(middleEastSection);

  // African languages
  const africanSection = CardService.newCardSection()
    .setHeader('African Languages');

  families['African'].slice(0, 8).forEach(function(code) {
    const langName = getLanguageName(code);
    const action = CardService.newAction()
      .setFunctionName(mode === 'translate' ? 'onTranslateEmail' : 'onReplyInLanguage')
      .setParameters(mode === 'translate'
        ? { messageId: messageId, targetLanguage: code }
        : { messageId: messageId, language: code })
      .setLoadIndicator(CardService.LoadIndicator.SPINNER);

    africanSection.addWidget(
      CardService.newDecoratedText()
        .setText(langName)
        .setOnClickAction(action)
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
    );
  });

  card.addSection(africanSection);

  return card.build();
}

/**
 * Handle email translation
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onTranslateEmail(e) {
  const messageId = e.parameters.messageId;
  const targetLanguage = e.parameters.targetLanguage;

  try {
    const message = validateAndGetMessage(messageId);
    const body = getEmailBody(message);
    const result = translateEmail(body, targetLanguage);
    const card = buildTranslationResultCard(result, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onTranslateEmail', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Translation failed: ' + error.message)
      )
      .build();
  }
}

/**
 * Build translation result card
 * @param {Object} result - Translation result
 * @param {string} messageId - Message ID
 * @returns {Card}
 */
function buildTranslationResultCard(result, messageId) {
  const card = CardService.newCardBuilder();

  const targetName = result.targetLanguageName || getLanguageName(result.targetLanguage) || result.targetLanguage;

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Translation')
      .setSubtitle('To: ' + targetName)
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(LOGO_URL)
  );

  // Translation info section
  const infoSection = CardService.newCardSection();

  infoSection.addWidget(
    CardService.newDecoratedText()
      .setText('Source: ' + (result.sourceLanguage === 'auto' ? 'Auto-detected' : result.sourceLanguage))
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.PERSON))
  );

  if (result.service) {
    infoSection.addWidget(
      CardService.newDecoratedText()
        .setText(result.service)
        .setBottomLabel('Translation service')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR))
    );
  }

  card.addSection(infoSection);

  // Translated text section
  const textSection = CardService.newCardSection()
    .setHeader('Translated Text')
    .addWidget(
      CardService.newTextParagraph()
        .setText(result.translatedText)
    );

  if (result.notes && result.notes.length > 0) {
    textSection.addWidget(
      CardService.newTextParagraph()
        .setText('Note: ' + result.notes)
    );
  }

  card.addSection(textSection);

  // Action buttons
  const actionsSection = CardService.newCardSection();

  // Copy translation functionality note
  actionsSection.addWidget(
    CardService.newTextParagraph()
      .setText('Select and copy the translated text above to use it.')
  );

  // Draft reply with translation
  const draftAction = CardService.newAction()
    .setFunctionName('onDraftReplyStart')
    .setParameters({ messageId: messageId });

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Draft Reply')
      .setOnClickAction(draftAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  card.addSection(actionsSection);

  return card.build();
}

/**
 * Handle reply in specific language
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onReplyInLanguage(e) {
  const messageId = e.parameters.messageId;
  const language = e.parameters.language;

  try {
    const message = validateAndGetMessage(messageId);
    const body = getEmailBody(message);
    const replyText = generateReplyInLanguage(body, '', language);
    const draft = createReplyDraft(message, replyText);

    const card = buildDraftResultCard(replyText, draft.getId(), messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onReplyInLanguage', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('Reply generation failed: ' + error.message)
      )
      .build();
  }
}

/**
 * Handle Follow-up Analysis
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onAnalyzeFollowUp(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = validateAndGetMessage(messageId);
    const body = getEmailBody(message);
    const result = analyzeFollowUp(body, messageId);
    const card = buildFollowUpCard(result, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onAnalyzeFollowUp', error);
    const errorCard = buildErrorCard('Follow-up Analysis Failed', parseError(error).message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(errorCard))
      .build();
  }
}

/**
 * Build follow-up analysis card
 * @param {Object} result - Follow-up analysis result
 * @param {string} messageId - Message ID
 * @returns {Card}
 */
function buildFollowUpCard(result, messageId) {
  const card = CardService.newCardBuilder();

  const needsFollowUp = result.needsFollowUp ? 'Yes' : 'No';

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Follow-up Analysis')
      .setSubtitle('Needs follow-up: ' + needsFollowUp)
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(LOGO_URL)
  );

  const section = CardService.newCardSection();

  section.addWidget(
    CardService.newDecoratedText()
      .setText('Urgency: ' + (result.urgency || 'none').toUpperCase())
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.CLOCK))
  );

  section.addWidget(
    CardService.newDecoratedText()
      .setText('Timeframe: ' + result.suggestedTimeframe)
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE))
  );

  section.addWidget(
    CardService.newDecoratedText()
      .setText('Type: ' + (result.followUpType || 'unknown').replace('_', ' '))
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
  );

  section.addWidget(
    CardService.newTextParagraph()
      .setText(result.reason)
  );

  card.addSection(section);

  // Draft reply button if follow-up needed
  if (result.needsFollowUp) {
    const buttonSection = CardService.newCardSection();

    const draftAction = CardService.newAction()
      .setFunctionName('onDraftReplyStart')
      .setParameters({ messageId: messageId });

    buttonSection.addWidget(
      CardService.newTextButton()
        .setText('Draft Follow-up Reply')
        .setOnClickAction(draftAction)
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    );

    card.addSection(buttonSection);
  }

  return card.build();
}

/**
 * Handle Meeting Detection
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function onDetectMeeting(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = validateAndGetMessage(messageId);
    const body = getEmailBody(message);
    const result = detectMeeting(body, messageId);
    const card = buildMeetingCard(result, messageId);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onDetectMeeting', error);
    const errorCard = buildErrorCard('Meeting Detection Failed', parseError(error).message);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(errorCard))
      .build();
  }
}

/**
 * Build meeting detection result card
 * @param {Object} result - Meeting detection result
 * @param {string} messageId - Message ID
 * @returns {Card}
 */
function buildMeetingCard(result, messageId) {
  const card = CardService.newCardBuilder();

  const hasMeeting = result.hasMeeting ? 'Yes' : 'No';

  card.setHeader(
    CardService.newCardHeader()
      .setTitle('Meeting Detection')
      .setSubtitle('Meeting found: ' + hasMeeting)
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(LOGO_URL)
  );

  if (!result.hasMeeting) {
    const section = CardService.newCardSection()
      .addWidget(
        CardService.newTextParagraph()
          .setText('No meeting or event detected in this email.')
      );
    card.addSection(section);
    return card.build();
  }

  // Meeting details section
  const detailsSection = CardService.newCardSection()
    .setHeader('Event Details');

  if (result.title) {
    detailsSection.addWidget(
      CardService.newDecoratedText()
        .setText(result.title)
        .setBottomLabel('Event Title')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR))
    );
  }

  if (result.meetingType) {
    detailsSection.addWidget(
      CardService.newDecoratedText()
        .setText(result.meetingType.replace('_', ' '))
        .setBottomLabel('Type')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK))
    );
  }

  if (result.proposedDates && result.proposedDates.length > 0) {
    result.proposedDates.forEach(function(date) {
      detailsSection.addWidget(
        CardService.newDecoratedText()
          .setText(date)
          .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.CLOCK))
      );
    });
  }

  if (result.duration) {
    detailsSection.addWidget(
      CardService.newDecoratedText()
        .setText(result.duration)
        .setBottomLabel('Duration')
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE))
    );
  }

  if (result.location) {
    detailsSection.addWidget(
      CardService.newDecoratedText()
        .setText(result.location)
        .setBottomLabel('Location')
        .setWrapText(true)
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.DESCRIPTION))
    );
  }

  card.addSection(detailsSection);

  // Attendees section
  if (result.attendees && result.attendees.length > 0) {
    const attendeesSection = CardService.newCardSection()
      .setHeader('Attendees');

    result.attendees.forEach(function(attendee) {
      attendeesSection.addWidget(
        CardService.newDecoratedText()
          .setText(attendee)
          .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.PERSON))
      );
    });

    card.addSection(attendeesSection);
  }

  // Status
  const statusSection = CardService.newCardSection();

  statusSection.addWidget(
    CardService.newDecoratedText()
      .setText(result.isConfirmed ? 'Confirmed' : 'Proposed / Tentative')
      .setBottomLabel('Status')
      .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR))
  );

  // Draft reply button
  const draftAction = CardService.newAction()
    .setFunctionName('onDraftReplyStart')
    .setParameters({ messageId: messageId });

  statusSection.addWidget(
    CardService.newTextButton()
      .setText('Draft Response')
      .setOnClickAction(draftAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  card.addSection(statusSection);

  return card.build();
}

// ============================================================================
// NEW FEATURE HANDLERS
// ============================================================================

/**
 * Show Priority Inbox dashboard
 */
function onShowPriorityInbox(e) {
  try {
    const inbox = getPriorityInbox(20);
    const card = buildPriorityInboxCard(inbox);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();
  } catch (error) {
    logError('onShowPriorityInbox', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error loading priority inbox'))
      .build();
  }
}

function buildPriorityInboxCard(inbox) {
  const card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader()
    .setTitle('Priority Inbox')
    .setSubtitle(inbox.totalEmails + ' emails analyzed')
    .setImageUrl(LOGO_URL));

  if (inbox.sections.urgent && inbox.sections.urgent.length > 0) {
    const urgentSection = CardService.newCardSection().setHeader('Urgent');
    inbox.sections.urgent.slice(0, 5).forEach(function(email) {
      urgentSection.addWidget(CardService.newDecoratedText()
        .setText(email.subject)
        .setBottomLabel(extractSenderName(email.from))
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR)));
    });
    card.addSection(urgentSection);
  }

  if (inbox.sections.important && inbox.sections.important.length > 0) {
    const importantSection = CardService.newCardSection().setHeader('Important');
    inbox.sections.important.slice(0, 5).forEach(function(email) {
      importantSection.addWidget(CardService.newDecoratedText()
        .setText(email.subject)
        .setBottomLabel(extractSenderName(email.from))
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK)));
    });
    card.addSection(importantSection);
  }

  return card.build();
}

function onRefreshPriorityInbox(e) {
  refreshPriorityInbox();
  return onShowPriorityInbox(e);
}

function onShowScheduledEmails(e) {
  const scheduled = getScheduledEmails();
  const card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader()
    .setTitle('Scheduled Emails')
    .setSubtitle(scheduled.length + ' pending'));

  const section = CardService.newCardSection();
  if (scheduled.length === 0) {
    section.addWidget(CardService.newTextParagraph().setText('No scheduled emails.'));
  } else {
    scheduled.forEach(function(email) {
      section.addWidget(CardService.newDecoratedText()
        .setText(email.subject)
        .setBottomLabel('To: ' + email.to + ' | ' + formatScheduledTime(email.sendAt))
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.CLOCK)));
    });
  }
  card.addSection(section);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card.build()))
    .build();
}

function onShowSnoozedEmails(e) {
  const snoozed = getSnoozedEmails();
  const card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader()
    .setTitle('Snoozed Emails')
    .setSubtitle(snoozed.length + ' reminders'));

  const section = CardService.newCardSection();
  if (snoozed.length === 0) {
    section.addWidget(CardService.newTextParagraph().setText('No snoozed emails.'));
  } else {
    snoozed.forEach(function(email) {
      section.addWidget(CardService.newDecoratedText()
        .setText(email.subject)
        .setBottomLabel(extractSenderName(email.from) + ' | ' + formatSnoozeTime(email.remindAt))
        .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.INVITE)));
    });
  }
  card.addSection(section);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card.build()))
    .build();
}

function onShowUsageStats(e) {
  const stats = getUsageStats();
  const card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader()
    .setTitle('Usage Statistics')
    .setSubtitle('Your productivity insights'));

  const section = CardService.newCardSection();
  section.addWidget(CardService.newDecoratedText()
    .setText('Total Actions: ' + stats.totalActions)
    .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.STAR)));
  section.addWidget(CardService.newDecoratedText()
    .setText('Sessions: ' + stats.totalSessions)
    .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.PERSON)));
  section.addWidget(CardService.newDecoratedText()
    .setText('Daily Average: ' + stats.dailyAverage)
    .setStartIcon(CardService.newIconImage().setIcon(CardService.Icon.BOOKMARK)));
  card.addSection(section);

  if (stats.topFeatures && stats.topFeatures.length > 0) {
    const featuresSection = CardService.newCardSection().setHeader('Top Features');
    stats.topFeatures.forEach(function(f) {
      featuresSection.addWidget(CardService.newDecoratedText()
        .setText(f.name.replace(/_/g, ' '))
        .setBottomLabel(f.count + ' uses'));
    });
    card.addSection(featuresSection);
  }

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card.build()))
    .build();
}

// Smart Compose handlers
function onImproveWriting(e) {
  const draftText = e.formInput?.draftText || '';
  if (!draftText) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Enter text first'))
      .build();
  }
  try {
    const result = improveWriting(draftText);
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Improved Writing'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(result.improved || draftText)))
      .build();
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + err.message))
      .build();
  }
}

function onCheckTone(e) {
  const draftText = e.formInput?.draftText || '';
  if (!draftText) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Enter text first'))
      .build();
  }
  try {
    const result = checkTone(draftText);
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Tone Analysis'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newDecoratedText()
          .setText('Detected: ' + (result.currentTone || 'Unknown'))
          .setBottomLabel(result.matchesTarget ? 'Matches target' : 'Consider adjusting')))
      .build();
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + err.message))
      .build();
  }
}

function onSuggestSubject(e) {
  const draftText = e.formInput?.draftText || '';
  if (!draftText) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Enter text first'))
      .build();
  }
  try {
    const subjects = suggestSubjectLines(draftText);
    const section = CardService.newCardSection();
    (subjects || []).forEach(function(s) {
      section.addWidget(CardService.newDecoratedText().setText(s).setWrapText(true));
    });
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Subject Ideas'))
      .addSection(section)
      .build();
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();
  } catch (err) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + err.message))
      .build();
  }
}

function onShowComposeTemplates(e) {
  const templates = getTemplates();
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Reply Templates')
      .setSubtitle(templates.length + ' templates available'));

  // Group templates by category
  const categories = {};
  templates.forEach(function(t) {
    const cat = t.category || 'general';
    if (!categories[cat]) {
      categories[cat] = [];
    }
    categories[cat].push(t);
  });

  // Category display names
  const categoryNames = {
    acknowledgment: 'Acknowledgment',
    meetings: 'Meetings',
    requests: 'Requests',
    followup: 'Follow-ups',
    thanks: 'Thank You',
    declines: 'Declines & Apologies',
    ooo: 'Out of Office',
    introductions: 'Introductions',
    updates: 'Status Updates',
    feedback: 'Feedback',
    general: 'General'
  };

  // Create a section for each category
  Object.keys(categories).forEach(function(cat) {
    const section = CardService.newCardSection()
      .setHeader(categoryNames[cat] || cat)
      .setCollapsible(true)
      .setNumUncollapsibleWidgets(0);

    categories[cat].forEach(function(t) {
      const action = CardService.newAction()
        .setFunctionName('onSelectTemplate')
        .setParameters({ templateId: t.id, templateName: t.name });

      section.addWidget(
        CardService.newDecoratedText()
          .setText(t.name)
          .setBottomLabel(t.description || '')
          .setWrapText(true)
          .setOnClickAction(action)
      );
    });

    card.addSection(section);
  });

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card.build()))
    .build();
}

function onSelectTemplate(e) {
  const templateId = e.parameters.templateId;
  const templateName = e.parameters.templateName;
  const template = getTemplateById(templateId);

  if (!template) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Template not found'))
      .build();
  }

  // Build a card showing the template with option to copy or use
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle(templateName)
      .setSubtitle(template.category || 'Template'));

  const previewSection = CardService.newCardSection()
    .setHeader('Template Preview');

  previewSection.addWidget(
    CardService.newTextParagraph()
      .setText(template.template)
  );

  card.addSection(previewSection);

  // Actions section
  const actionsSection = CardService.newCardSection();

  // Copy to clipboard instruction
  actionsSection.addWidget(
    CardService.newTextParagraph()
      .setText('<i>Copy the template above and paste into your email compose window, then customize the {{placeholders}}.</i>')
  );

  // Back button
  const backAction = CardService.newAction()
    .setFunctionName('onShowComposeTemplates');

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('← Back to Templates')
      .setOnClickAction(backAction)
  );

  card.addSection(actionsSection);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card.build()))
    .build();
}

// Alias functions for onboarding and error recovery
function showSettings(e) { return onOpenSettings(e); }
function showPriorityInbox(e) { return onShowPriorityInbox(e); }
function showUsageStats(e) { return onShowUsageStats(e); }
function refreshCard(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popToRoot())
    .build();
}

// ============================================================================
// SECURITY HANDLERS
// ============================================================================

/**
 * Quick security scan handler
 */
function onQuickSecurityScan(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = GmailApp.getMessageById(messageId);
    if (!message) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Message not found'))
        .build();
    }

    const result = quickSecurityCheck(message);
    const card = buildSecurityResultCard(result, message, 'quick');

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onQuickSecurityScan', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Full AI security scan handler
 */
function onFullSecurityScan(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = GmailApp.getMessageById(messageId);
    if (!message) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Message not found'))
        .build();
    }

    const result = analyzeEmailSecurity(message);
    const card = buildSecurityResultCard(result, message, 'full');

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onFullSecurityScan', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Build security result card
 */
function buildSecurityResultCard(result, message, scanType) {
  const card = CardService.newCardBuilder();

  // Determine header color/icon based on threat level
  const threatLevel = result.threatLevel || 'unknown';
  let statusIcon = CardService.Icon.STAR;
  let statusText = 'Safe';

  if (threatLevel === 'critical' || threatLevel === 'high') {
    statusIcon = CardService.Icon.NONE;
    statusText = threatLevel.toUpperCase() + ' RISK';
  } else if (threatLevel === 'medium') {
    statusIcon = CardService.Icon.CLOCK;
    statusText = 'Medium Risk';
  } else if (threatLevel === 'low') {
    statusIcon = CardService.Icon.BOOKMARK;
    statusText = 'Low Risk';
  }

  card.setHeader(CardService.newCardHeader()
    .setTitle('Security Analysis')
    .setSubtitle(statusText + ' - ' + (scanType === 'full' ? 'AI Scan' : 'Quick Scan')));

  // Summary section
  const summarySection = CardService.newCardSection()
    .setHeader('Results');

  summarySection.addWidget(
    CardService.newDecoratedText()
      .setText('Threat Level: ' + threatLevel.toUpperCase())
      .setWrapText(true)
  );

  if (result.confidence !== undefined) {
    summarySection.addWidget(
      CardService.newDecoratedText()
        .setText('Confidence: ' + result.confidence + '%')
        .setWrapText(true)
    );
  }

  if (result.threatType && result.threatType !== 'none') {
    summarySection.addWidget(
      CardService.newDecoratedText()
        .setText('Type: ' + result.threatType.toUpperCase())
        .setWrapText(true)
    );
  }

  if (result.summary) {
    summarySection.addWidget(
      CardService.newTextParagraph()
        .setText('<b>Summary:</b> ' + result.summary)
    );
  }

  card.addSection(summarySection);

  // Red flags section
  const flags = result.redFlags || result.indicators || [];
  if (flags.length > 0) {
    const flagsSection = CardService.newCardSection()
      .setHeader('Red Flags (' + flags.length + ')')
      .setCollapsible(true);

    flags.forEach(function(flag) {
      flagsSection.addWidget(
        CardService.newDecoratedText()
          .setText('⚠ ' + flag)
          .setWrapText(true)
      );
    });

    card.addSection(flagsSection);
  }

  // Recommendations section
  if (result.recommendations && result.recommendations.length > 0) {
    const recsSection = CardService.newCardSection()
      .setHeader('Recommendations')
      .setCollapsible(true);

    result.recommendations.forEach(function(rec) {
      recsSection.addWidget(
        CardService.newDecoratedText()
          .setText('• ' + rec)
          .setWrapText(true)
      );
    });

    card.addSection(recsSection);
  }

  // Actions section
  const actionsSection = CardService.newCardSection()
    .setHeader('Actions');

  const messageId = message.getId();

  // Archive as suspicious
  const archiveAction = CardService.newAction()
    .setFunctionName('onArchiveSuspicious')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Archive as Suspicious')
      .setOnClickAction(archiveAction)
  );

  // Report phishing
  const phishingAction = CardService.newAction()
    .setFunctionName('onReportPhishing')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Report as Phishing')
      .setOnClickAction(phishingAction)
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
  );

  // Mark as safe
  const safeAction = CardService.newAction()
    .setFunctionName('onMarkAsSafe')
    .setParameters({ messageId: messageId })
    .setLoadIndicator(CardService.LoadIndicator.SPINNER);

  actionsSection.addWidget(
    CardService.newTextButton()
      .setText('Mark as Safe')
      .setOnClickAction(safeAction)
  );

  card.addSection(actionsSection);

  return card.build();
}

/**
 * Report email as phishing handler
 */
function onReportPhishing(e) {
  const messageId = e.parameters.messageId;

  try {
    const result = reportAsPhishing(messageId);

    if (result.success) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Reported as phishing and moved to spam'))
        .setNavigation(CardService.newNavigation().popToRoot())
        .build();
    } else {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Error: ' + result.error))
        .build();
    }

  } catch (error) {
    logError('onReportPhishing', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Report email as spam handler
 */
function onReportSpam(e) {
  const messageId = e.parameters.messageId;

  try {
    const result = reportAsSpam(messageId);

    if (result.success) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Reported as spam'))
        .setNavigation(CardService.newNavigation().popToRoot())
        .build();
    } else {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Error: ' + result.error))
        .build();
    }

  } catch (error) {
    logError('onReportSpam', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Archive suspicious email handler
 */
function onArchiveSuspicious(e) {
  const messageId = e.parameters.messageId;

  try {
    const result = archiveSuspiciousEmail(messageId, 'Manual archive from security scan');

    if (result.success) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Archived and labeled as suspicious'))
        .setNavigation(CardService.newNavigation().popToRoot())
        .build();
    } else {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Error: ' + result.error))
        .build();
    }

  } catch (error) {
    logError('onArchiveSuspicious', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Mark email as safe handler
 */
function onMarkAsSafe(e) {
  const messageId = e.parameters.messageId;

  try {
    const result = markAsSafe(messageId);

    if (result.success) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Marked as safe, sender whitelisted'))
        .setNavigation(CardService.newNavigation().popToRoot())
        .build();
    } else {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Error: ' + result.error))
        .build();
    }

  } catch (error) {
    logError('onMarkAsSafe', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Navigate back to home card
 */
function onBackToHome(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
    .build();
}

// ============================================================================
// BULK ACTION HANDLERS
// ============================================================================

/**
 * Bulk security scan handler - shows selection card for message count
 */
function onBulkSecurityScan(e) {
  try {
    const card = buildScanCountSelectionCard();
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();
  } catch (error) {
    logError('onBulkSecurityScan', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Build card to select number of messages to scan
 */
function buildScanCountSelectionCard() {
  const card = CardService.newCardBuilder();

  card.setHeader(CardService.newCardHeader()
    .setTitle('Security Scan')
    .setSubtitle('Select how many messages to scan'));

  const section = CardService.newCardSection();

  section.addWidget(
    CardService.newTextParagraph()
      .setText('Scanning more messages takes longer but provides broader coverage. AI analysis is performed on each email.')
  );

  // Button grid for count selection
  const counts = [
    { value: 20, label: '20 messages', desc: 'Quick scan (~1 min)' },
    { value: 50, label: '50 messages', desc: 'Standard scan (~2-3 min)' },
    { value: 100, label: '100 messages', desc: 'Deep scan (~5 min)' },
    { value: 0, label: 'ALL unread', desc: 'Full inbox scan (may take a while)' }
  ];

  counts.forEach(function(opt) {
    const action = CardService.newAction()
      .setFunctionName('onBulkSecurityScanExecute')
      .setParameters({ count: String(opt.value) })
      .setLoadIndicator(CardService.LoadIndicator.SPINNER);

    section.addWidget(
      CardService.newDecoratedText()
        .setText(opt.label)
        .setBottomLabel(opt.desc)
        .setOnClickAction(action)
    );
  });

  card.addSection(section);

  // Back button
  const backSection = CardService.newCardSection();
  const backAction = CardService.newAction()
    .setFunctionName('onBackToHome');

  backSection.addWidget(
    CardService.newTextButton()
      .setText('Cancel')
      .setOnClickAction(backAction)
  );

  card.addSection(backSection);

  return card.build();
}

/**
 * Execute bulk security scan with specified count
 */
function onBulkSecurityScanExecute(e) {
  try {
    const countParam = e.parameters.count;
    const count = countParam === '0' ? 500 : parseInt(countParam, 10); // 0 means ALL (capped at 500)

    const results = batchSecurityScan(count);
    const card = buildBulkScanResultsCard(results);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onBulkSecurityScanExecute', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Build bulk scan results card
 */
function buildBulkScanResultsCard(results) {
  const card = CardService.newCardBuilder();

  card.setHeader(CardService.newCardHeader()
    .setTitle('Security Scan Results')
    .setSubtitle(results.scanned + ' emails scanned'));

  // Summary section
  const summarySection = CardService.newCardSection()
    .setHeader('Summary');

  summarySection.addWidget(
    CardService.newDecoratedText()
      .setText('Scanned: ' + results.scanned)
      .setWrapText(true)
  );

  summarySection.addWidget(
    CardService.newDecoratedText()
      .setText('Safe: ' + results.safe)
      .setWrapText(true)
  );

  summarySection.addWidget(
    CardService.newDecoratedText()
      .setText('Threats Found: ' + results.threats.length)
      .setWrapText(true)
  );

  if (results.errors > 0) {
    summarySection.addWidget(
      CardService.newDecoratedText()
        .setText('Errors: ' + results.errors)
        .setWrapText(true)
    );
  }

  card.addSection(summarySection);

  // Threats section
  if (results.threats.length > 0) {
    const threatsSection = CardService.newCardSection()
      .setHeader('Threats Detected (' + results.threats.length + ')')
      .setCollapsible(true);

    results.threats.forEach(function(threat) {
      const threatAction = CardService.newAction()
        .setFunctionName('onViewThreatDetails')
        .setParameters({
          messageId: threat.messageId,
          threatLevel: threat.threatLevel
        });

      threatsSection.addWidget(
        CardService.newDecoratedText()
          .setText(threat.subject.substring(0, 50) + (threat.subject.length > 50 ? '...' : ''))
          .setBottomLabel(threat.threatLevel.toUpperCase() + ' - ' + threat.from.substring(0, 30))
          .setWrapText(true)
          .setOnClickAction(threatAction)
      );
    });

    // Bulk action buttons
    if (results.threats.length > 0) {
      const archiveAllAction = CardService.newAction()
        .setFunctionName('onBulkArchiveThreats')
        .setParameters({ threats: JSON.stringify(results.threats) })
        .setLoadIndicator(CardService.LoadIndicator.SPINNER);

      threatsSection.addWidget(
        CardService.newTextButton()
          .setText('Archive All Threats')
          .setOnClickAction(archiveAllAction)
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      );

      const spamAllAction = CardService.newAction()
        .setFunctionName('onBulkSpamThreats')
        .setParameters({ threats: JSON.stringify(results.threats) })
        .setLoadIndicator(CardService.LoadIndicator.SPINNER);

      threatsSection.addWidget(
        CardService.newTextButton()
          .setText('Report All as Spam')
          .setOnClickAction(spamAllAction)
      );
    }

    card.addSection(threatsSection);
  }

  return card.build();
}

/**
 * View threat details handler
 */
function onViewThreatDetails(e) {
  const messageId = e.parameters.messageId;

  try {
    const message = GmailApp.getMessageById(messageId);
    if (!message) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('Message not found'))
        .build();
    }

    const result = quickSecurityCheck(message);
    const card = buildSecurityResultCard(result, message, 'quick');

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Bulk archive threats handler
 */
function onBulkArchiveThreats(e) {
  try {
    const threats = JSON.parse(e.parameters.threats);
    const results = bulkArchiveThreats(threats);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Archived ' + results.archived + ' threats'))
      .setNavigation(CardService.newNavigation().popToRoot())
      .build();

  } catch (error) {
    logError('onBulkArchiveThreats', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Bulk spam threats handler
 */
function onBulkSpamThreats(e) {
  try {
    const threats = JSON.parse(e.parameters.threats);
    const messageIds = threats.map(function(t) { return t.messageId; });
    const results = bulkReportSpam(messageIds);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Reported ' + results.reported + ' emails as spam'))
      .setNavigation(CardService.newNavigation().popToRoot())
      .build();

  } catch (error) {
    logError('onBulkSpamThreats', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Bulk archive old emails handler
 */
function onBulkArchiveOld(e) {
  try {
    // Get threads older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const query = 'in:inbox before:' + Utilities.formatDate(thirtyDaysAgo, Session.getScriptTimeZone(), 'yyyy/MM/dd');

    const threads = GmailApp.search(query, 0, 50);
    let archived = 0;

    threads.forEach(function(thread) {
      try {
        thread.moveToArchive();
        archived++;
      } catch (e) {}
    });

    trackFeatureUsage('bulk_archive_old');

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Archived ' + archived + ' old emails'))
      .build();

  } catch (error) {
    logError('onBulkArchiveOld', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Bulk mark as read handler
 */
function onBulkMarkRead(e) {
  try {
    const threads = GmailApp.getInboxThreads(0, 100);
    let marked = 0;

    threads.forEach(function(thread) {
      try {
        if (thread.isUnread()) {
          thread.markRead();
          marked++;
        }
      } catch (e) {}
    });

    trackFeatureUsage('bulk_mark_read');

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Marked ' + marked + ' emails as read'))
      .build();

  } catch (error) {
    logError('onBulkMarkRead', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Show inbox summary handler
 */
function onShowInboxSummary(e) {
  try {
    const summary = getInboxSummary(50);
    const card = buildInboxSummaryCard(summary);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();

  } catch (error) {
    logError('onShowInboxSummary', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Error: ' + error.message))
      .build();
  }
}

/**
 * Build inbox summary card
 */
function buildInboxSummaryCard(summary) {
  const card = CardService.newCardBuilder();

  card.setHeader(CardService.newCardHeader()
    .setTitle('Inbox Summary')
    .setSubtitle(summary.total + ' emails analyzed'));

  // Overview section
  const overviewSection = CardService.newCardSection()
    .setHeader('Overview');

  overviewSection.addWidget(
    CardService.newDecoratedText()
      .setText('Total in Inbox: ' + summary.total)
  );

  overviewSection.addWidget(
    CardService.newDecoratedText()
      .setText('Unread: ' + summary.unread)
  );

  if (summary.oldestDate) {
    overviewSection.addWidget(
      CardService.newDecoratedText()
        .setText('Oldest: ' + Utilities.formatDate(summary.oldestDate, Session.getScriptTimeZone(), 'MMM d, yyyy'))
    );
  }

  card.addSection(overviewSection);

  // Threats section
  const threatsSection = CardService.newCardSection()
    .setHeader('Security Threats');

  threatsSection.addWidget(
    CardService.newDecoratedText()
      .setText('High Risk: ' + summary.threats.high)
      .setBottomLabel(summary.threats.high > 0 ? 'Action recommended' : 'None found')
  );

  threatsSection.addWidget(
    CardService.newDecoratedText()
      .setText('Medium Risk: ' + summary.threats.medium)
  );

  threatsSection.addWidget(
    CardService.newDecoratedText()
      .setText('Low Risk: ' + summary.threats.low)
  );

  card.addSection(threatsSection);

  // Quick actions
  const actionsSection = CardService.newCardSection()
    .setHeader('Quick Actions');

  if (summary.threats.high > 0 || summary.threats.medium > 0) {
    const scanAction = CardService.newAction()
      .setFunctionName('onBulkSecurityScan')
      .setLoadIndicator(CardService.LoadIndicator.SPINNER);

    actionsSection.addWidget(
      CardService.newTextButton()
        .setText('View Threat Details')
        .setOnClickAction(scanAction)
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
    );
  }

  if (summary.unread > 10) {
    const markReadAction = CardService.newAction()
      .setFunctionName('onBulkMarkRead')
      .setLoadIndicator(CardService.LoadIndicator.SPINNER);

    actionsSection.addWidget(
      CardService.newTextButton()
        .setText('Mark All as Read')
        .setOnClickAction(markReadAction)
    );
  }

  card.addSection(actionsSection);

  return card.build();
}
