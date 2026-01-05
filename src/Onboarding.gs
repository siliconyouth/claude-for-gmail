/**
 * Onboarding Flow
 * Guide new users through setup
 */

// Onboarding preference keys
const PREF_ONBOARDING_COMPLETE = 'onboarding_complete';
const PREF_ONBOARDING_STEP = 'onboarding_step';
const PREF_ONBOARDING_STARTED = 'onboarding_started';

// Onboarding steps
const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  API_KEY: 'api_key',
  PREFERENCES: 'preferences',
  FEATURES: 'features',
  COMPLETE: 'complete'
};

/**
 * Check if onboarding is needed
 * @returns {boolean}
 */
function needsOnboarding() {
  return !getPreference(PREF_ONBOARDING_COMPLETE, false);
}

/**
 * Get current onboarding step
 * @returns {string} Current step
 */
function getCurrentOnboardingStep() {
  return getPreference(PREF_ONBOARDING_STEP, ONBOARDING_STEPS.WELCOME);
}

/**
 * Build onboarding card based on current step
 * @returns {Card}
 */
function buildOnboardingCard() {
  const step = getCurrentOnboardingStep();

  switch (step) {
    case ONBOARDING_STEPS.WELCOME:
      return buildWelcomeCard();
    case ONBOARDING_STEPS.API_KEY:
      return buildApiKeySetupCard();
    case ONBOARDING_STEPS.PREFERENCES:
      return buildPreferencesSetupCard();
    case ONBOARDING_STEPS.FEATURES:
      return buildFeaturesOverviewCard();
    case ONBOARDING_STEPS.COMPLETE:
      return buildOnboardingCompleteCard();
    default:
      return buildWelcomeCard();
  }
}

/**
 * Build welcome card
 * @returns {Card}
 */
function buildWelcomeCard() {
  const builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Welcome to Claude for Gmail!')
      .setSubtitle('AI-powered email assistance'));

  // Welcome message
  const welcomeSection = CardService.newCardSection()
    .addWidget(CardService.newDecoratedText()
      .setText('Let\'s set up your AI assistant in just a few steps.')
      .setWrapText(true))
    .addWidget(CardService.newTextParagraph()
      .setText('<b>What you\'ll be able to do:</b>'))
    .addWidget(CardService.newDecoratedText()
      .setText('✓ Summarize long emails instantly')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setText('✓ Generate smart replies')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setText('✓ Translate emails to 100+ languages')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setText('✓ Prioritize your inbox with AI')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setText('✓ Schedule emails and snooze reminders')
      .setWrapText(true));

  builder.addSection(welcomeSection);

  // Start button
  const actionSection = CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('Get Started →')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('onboardingNextStep')));

  builder.addSection(actionSection);

  // Mark onboarding started
  if (!getPreference(PREF_ONBOARDING_STARTED)) {
    setPreference(PREF_ONBOARDING_STARTED, new Date().toISOString());
  }

  return builder.build();
}

/**
 * Build API key setup card
 * @returns {Card}
 */
function buildApiKeySetupCard() {
  const builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Step 1: Connect Claude AI')
      .setSubtitle('Enter your Anthropic API key'));

  const currentKey = getPreference(PREF_API_KEY, '');
  const hasKey = currentKey && currentKey.length > 0;

  const setupSection = CardService.newCardSection();

  if (hasKey) {
    setupSection.addWidget(CardService.newDecoratedText()
      .setText('✓ API key configured')
      .setStartIcon(CardService.newIconImage()
        .setIconUrl('https://www.gstatic.com/images/icons/material/system/1x/check_circle_googgreen_24dp.png'))
      .setWrapText(true));
  } else {
    setupSection.addWidget(CardService.newTextParagraph()
      .setText('You\'ll need an API key from <a href="https://console.anthropic.com/">Anthropic Console</a>'));

    setupSection.addWidget(CardService.newTextInput()
      .setFieldName('apiKey')
      .setTitle('API Key')
      .setHint('sk-ant-...')
      .setValue(currentKey));

    setupSection.addWidget(CardService.newTextButton()
      .setText('Save API Key')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('saveApiKeyOnboarding')));
  }

  builder.addSection(setupSection);

  // Navigation
  const navSection = CardService.newCardSection()
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('← Back')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('onboardingPrevStep')))
      .addButton(CardService.newTextButton()
        .setText(hasKey ? 'Next →' : 'Skip for Now')
        .setTextButtonStyle(hasKey ? CardService.TextButtonStyle.FILLED : CardService.TextButtonStyle.TEXT)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('onboardingNextStep'))));

  builder.addSection(navSection);

  return builder.build();
}

/**
 * Build preferences setup card
 * @returns {Card}
 */
function buildPreferencesSetupCard() {
  const builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Step 2: Your Preferences')
      .setSubtitle('Customize your experience'));

  const currentTone = getPreference(PREF_REPLY_TONE, DEFAULT_REPLY_TONE);
  const currentLength = getPreference(PREF_REPLY_LENGTH, DEFAULT_REPLY_LENGTH);

  // Tone preference
  const toneSection = CardService.newCardSection()
    .setHeader('Reply Tone')
    .addWidget(CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.RADIO_BUTTON)
      .setFieldName('replyTone')
      .addItem('Professional', 'professional', currentTone === 'professional')
      .addItem('Friendly', 'friendly', currentTone === 'friendly')
      .addItem('Casual', 'casual', currentTone === 'casual')
      .addItem('Formal', 'formal', currentTone === 'formal'));

  builder.addSection(toneSection);

  // Length preference
  const lengthSection = CardService.newCardSection()
    .setHeader('Reply Length')
    .addWidget(CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.RADIO_BUTTON)
      .setFieldName('replyLength')
      .addItem('Short (1-2 sentences)', 'short', currentLength === 'short')
      .addItem('Medium (1 paragraph)', 'medium', currentLength === 'medium')
      .addItem('Long (detailed)', 'long', currentLength === 'long'));

  builder.addSection(lengthSection);

  // Save button
  const saveSection = CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('Save Preferences')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('savePreferencesOnboarding')));

  builder.addSection(saveSection);

  // Navigation
  const navSection = CardService.newCardSection()
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('← Back')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('onboardingPrevStep')))
      .addButton(CardService.newTextButton()
        .setText('Next →')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('onboardingNextStep'))));

  builder.addSection(navSection);

  return builder.build();
}

/**
 * Build features overview card
 * @returns {Card}
 */
function buildFeaturesOverviewCard() {
  const builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Step 3: Feature Tour')
      .setSubtitle('What you can do'));

  // Core features
  const coreSection = CardService.newCardSection()
    .setHeader('Core Features')
    .addWidget(CardService.newDecoratedText()
      .setText('<b>Summarize</b> - Get key points from any email')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setText('<b>Reply</b> - Generate smart, contextual responses')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setText('<b>Translate</b> - 100+ languages supported')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setText('<b>Extract</b> - Pull action items & key info')
      .setWrapText(true));

  builder.addSection(coreSection);

  // Productivity features
  const prodSection = CardService.newCardSection()
    .setHeader('Productivity Features')
    .addWidget(CardService.newDecoratedText()
      .setText('<b>Priority Inbox</b> - AI-sorted by importance')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setText('<b>Smart Compose</b> - Writing suggestions')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setText('<b>Schedule</b> - Send emails later')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setText('<b>Snooze</b> - Remind me later')
      .setWrapText(true));

  builder.addSection(prodSection);

  // Tips
  const tipsSection = CardService.newCardSection()
    .setHeader('Pro Tips')
    .addWidget(CardService.newTextParagraph()
      .setText('• Click any email to see AI options\n• Use templates for quick replies\n• Check Priority Inbox daily'));

  builder.addSection(tipsSection);

  // Navigation
  const navSection = CardService.newCardSection()
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('← Back')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('onboardingPrevStep')))
      .addButton(CardService.newTextButton()
        .setText('Finish Setup →')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction()
          .setFunctionName('onboardingNextStep'))));

  builder.addSection(navSection);

  return builder.build();
}

/**
 * Build onboarding complete card
 * @returns {Card}
 */
function buildOnboardingCompleteCard() {
  const builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('You\'re All Set!')
      .setSubtitle('Start using Claude for Gmail'));

  const completeSection = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText('🎉 <b>Congratulations!</b>\n\nYou\'re ready to supercharge your email productivity with AI.'))
    .addWidget(CardService.newDecoratedText()
      .setText('Open any email to see AI options appear automatically.')
      .setWrapText(true));

  builder.addSection(completeSection);

  // Quick actions
  const actionsSection = CardService.newCardSection()
    .setHeader('Quick Actions')
    .addWidget(CardService.newTextButton()
      .setText('View Priority Inbox')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showPriorityInbox')))
    .addWidget(CardService.newTextButton()
      .setText('Open Settings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showSettings')))
    .addWidget(CardService.newTextButton()
      .setText('View Usage Stats')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showUsageStats')));

  builder.addSection(actionsSection);

  // Mark onboarding complete
  setPreference(PREF_ONBOARDING_COMPLETE, true);
  setPreference(PREF_ONBOARDING_STEP, ONBOARDING_STEPS.COMPLETE);

  // Track completion
  trackFeatureUsage('onboarding_complete');

  return builder.build();
}

/**
 * Handle next step in onboarding
 * @returns {ActionResponse}
 */
function onboardingNextStep() {
  const currentStep = getCurrentOnboardingStep();
  let nextStep;

  switch (currentStep) {
    case ONBOARDING_STEPS.WELCOME:
      nextStep = ONBOARDING_STEPS.API_KEY;
      break;
    case ONBOARDING_STEPS.API_KEY:
      nextStep = ONBOARDING_STEPS.PREFERENCES;
      break;
    case ONBOARDING_STEPS.PREFERENCES:
      nextStep = ONBOARDING_STEPS.FEATURES;
      break;
    case ONBOARDING_STEPS.FEATURES:
      nextStep = ONBOARDING_STEPS.COMPLETE;
      break;
    default:
      nextStep = ONBOARDING_STEPS.COMPLETE;
  }

  setPreference(PREF_ONBOARDING_STEP, nextStep);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .updateCard(buildOnboardingCard()))
    .build();
}

/**
 * Handle previous step in onboarding
 * @returns {ActionResponse}
 */
function onboardingPrevStep() {
  const currentStep = getCurrentOnboardingStep();
  let prevStep;

  switch (currentStep) {
    case ONBOARDING_STEPS.API_KEY:
      prevStep = ONBOARDING_STEPS.WELCOME;
      break;
    case ONBOARDING_STEPS.PREFERENCES:
      prevStep = ONBOARDING_STEPS.API_KEY;
      break;
    case ONBOARDING_STEPS.FEATURES:
      prevStep = ONBOARDING_STEPS.PREFERENCES;
      break;
    case ONBOARDING_STEPS.COMPLETE:
      prevStep = ONBOARDING_STEPS.FEATURES;
      break;
    default:
      prevStep = ONBOARDING_STEPS.WELCOME;
  }

  setPreference(PREF_ONBOARDING_STEP, prevStep);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .updateCard(buildOnboardingCard()))
    .build();
}

/**
 * Save API key during onboarding
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function saveApiKeyOnboarding(e) {
  const apiKey = e.formInput.apiKey;

  if (!apiKey || apiKey.trim().length === 0) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Please enter an API key'))
      .build();
  }

  // Validate key format
  if (!apiKey.startsWith('sk-ant-')) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('Invalid API key format. Key should start with sk-ant-'))
      .build();
  }

  setPreference(PREF_API_KEY, apiKey.trim());

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('API key saved!'))
    .setNavigation(CardService.newNavigation()
      .updateCard(buildApiKeySetupCard()))
    .build();
}

/**
 * Save preferences during onboarding
 * @param {Object} e - Event object
 * @returns {ActionResponse}
 */
function savePreferencesOnboarding(e) {
  const tone = e.formInput.replyTone;
  const length = e.formInput.replyLength;

  if (tone) {
    setPreference(PREF_REPLY_TONE, tone);
  }

  if (length) {
    setPreference(PREF_REPLY_LENGTH, length);
  }

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText('Preferences saved!'))
    .build();
}

/**
 * Skip onboarding entirely
 * @returns {ActionResponse}
 */
function skipOnboarding() {
  setPreference(PREF_ONBOARDING_COMPLETE, true);
  setPreference(PREF_ONBOARDING_STEP, ONBOARDING_STEPS.COMPLETE);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation()
      .popToRoot())
    .build();
}

/**
 * Reset onboarding for testing
 */
function resetOnboarding() {
  setPreference(PREF_ONBOARDING_COMPLETE, false);
  setPreference(PREF_ONBOARDING_STEP, ONBOARDING_STEPS.WELCOME);
  setPreference(PREF_ONBOARDING_STARTED, null);

  Logger.log('Onboarding reset');
}

