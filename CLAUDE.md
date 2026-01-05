# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude for Gmail is a comprehensive Google Apps Script Gmail Add-on that integrates Claude AI (Opus 4.5) for intelligent email assistance. It provides a sidebar UI within Gmail featuring:

- **Core AI**: Email summarization, analysis, draft replies, action item extraction
- **Translation**: 100+ languages via Google Translate (free)
- **Calendar**: Create events from detected meetings
- **Contacts**: Sender insights and communication history
- **Attachments**: AI-powered document summaries
- **Scheduling**: Send emails at specific times
- **Priority Inbox**: AI-sorted email dashboard
- **Snooze**: Remind later functionality
- **Analytics**: Usage tracking
- **Offline**: Cached access to recent analyses

## Development Commands

```bash
# Push local changes to Google Apps Script
clasp push

# Force push (overwrites remote)
clasp push --force

# Pull remote changes
clasp pull

# Deploy a new version
clasp deploy

# View execution logs
clasp logs

# Open in browser
clasp open

# Run a specific function
clasp run <functionName>
```

## Project Structure

```
claude-for-gmail/
├── src/
│   ├── Code.gs          # Main entry point, test functions
│   ├── Addon.gs         # Gmail Add-on UI (CardService cards)
│   ├── Claude.gs        # Claude API integration with caching
│   ├── Gmail.gs         # Gmail utilities (get emails, create drafts)
│   ├── Config.gs        # Configuration, API key, user preferences
│   ├── Utils.gs         # Error handling, retry logic, caching
│   ├── Scheduler.gs     # Unified scheduler (single trigger)
│   ├── Labels.gs        # Smart auto-labeling (15 categories)
│   ├── Digest.gs        # Daily email digest
│   ├── Templates.gs     # 20+ email templates with AI fill-in
│   ├── Translation.gs   # Google Translate (109 languages)
│   ├── Calendar.gs      # Google Calendar integration
│   ├── Contacts.gs      # Contact insights and history
│   ├── Attachments.gs   # PDF/document summarization
│   ├── Scheduling.gs    # Email send scheduling
│   ├── Priority.gs      # AI priority inbox dashboard
│   ├── Snooze.gs        # Snooze/remind feature
│   ├── Analytics.gs     # Usage analytics tracking
│   └── Onboarding.gs    # First-time user setup wizard
├── assets/
│   ├── logo.svg         # Source logo (SVG)
│   └── logo.png         # Gmail add-on logo (PNG required)
├── appsscript.json      # Apps Script manifest + OAuth scopes
├── .clasp.json          # clasp config (gitignored)
├── CLAUDE.md            # This file
└── README.md            # User documentation
```

## Architecture

### Gmail Add-on UI (Addon.gs)

The UI is built entirely with Google's CardService API:

```javascript
// Card structure
CardService.newCardBuilder()
  .setHeader(CardService.newCardHeader().setTitle('Title'))
  .addSection(CardService.newCardSection()
    .addWidget(CardService.newTextButton()
      .setText('Action')
      .setOnClickAction(CardService.newAction().setFunctionName('handler'))
    )
  )
  .build()
```

**Key handlers:**
- `onHomepage(e)` - Sidebar home (no email selected)
- `onGmailMessage(e)` - Email context (viewing an email)
- `onCompose(e)` - Compose context (writing new email)

**Navigation pattern:**
```javascript
CardService.newNavigation().pushCard(newCard)  // Push new card
CardService.newNavigation().popCard()          // Go back
```

### Unified Scheduler (Scheduler.gs)

**Critical constraint**: Add-ons are limited to 1 time-based trigger per user.

The unified scheduler runs hourly and checks which features need to run:

```javascript
function runScheduledTasks() {
  // Runs every hour
  if (isAutoLabelEnabled()) runAutoLabeling();
  if (isDigestEnabled() && isDigestTime()) sendDailyDigest();
  if (hasScheduledEmails()) sendScheduledEmails();
  if (hasSnoozedEmails()) checkSnoozeReminders();
}
```

Enable/disable features:
```javascript
enableAutoLabel()    / disableAutoLabel()
enableDigest(hour)   / disableDigest()
```

### Claude API Integration (Claude.gs)

```javascript
// Base API call with retry
askClaude(prompt, systemPrompt)

// Specialized functions (with caching)
summarizeEmail(body, messageId)
analyzeEmail(body, messageId)
extractActionItems(body, messageId)
fullEmailAnalysis(body, messageId)

// Without caching
generateReply(body, instructions)
generateReplyInLanguage(body, instructions, languageCode)
```

### Translation (Translation.gs)

Uses Google's free LanguageApp service:

```javascript
// 109 languages supported
translateWithGoogle(text, targetLang, sourceLang)
detectLanguageGoogle(text)
getCommonLanguages()      // Top 24 languages
getAllLanguagesSorted()   // All 109 alphabetically
getLanguageFamilies()     // Grouped by region
```

### Caching (Utils.gs)

```javascript
// Cache key format
getAnalysisCacheKey(messageId, type)  // 'claude_gmail_{type}_{messageId}'

// Operations
setCached(key, value, expiration)  // Default: 6 hours
getCached(key)
clearMessageCache(messageId)
```

### Error Handling (Utils.gs)

```javascript
// Retry with exponential backoff
withRetry(fn, { maxRetries: 3, initialDelay: 2000, maxDelay: 30000 })

// Parse errors for user display
parseError(error)  // Returns { message, type, retryable }

// User-friendly error cards
buildErrorCard(title, message)
```

## Key Constraints

| Constraint | Limit | Solution |
|------------|-------|----------|
| Execution time | 6 minutes | Batch processing, timeout checks |
| Triggers per user | 1 | Unified scheduler |
| HTTP client | UrlFetchApp only | No axios/fetch |
| Packages | None | Self-contained code |
| CardService styling | Limited | Use built-in icons/styles |
| Add-on context | Contextual only | Pass messageId in parameters |

## OAuth Scopes (appsscript.json)

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.addons.execute",
    "https://www.googleapis.com/auth/gmail.addons.current.message.readonly",
    "https://www.googleapis.com/auth/gmail.addons.current.action.compose",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

## Feature Implementation Patterns

### Adding a New Feature

1. **Create the service file** (e.g., `NewFeature.gs`):
```javascript
function doNewFeatureThing(input) {
  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Call Claude or other API
  const result = askClaude(prompt, systemPrompt);

  // Cache and return
  setCached(cacheKey, result);
  return result;
}
```

2. **Add UI handler in Addon.gs**:
```javascript
function onNewFeature(e) {
  const messageId = e.parameters.messageId;
  try {
    trackFeatureUsage('new_feature');  // Analytics
    const result = doNewFeatureThing(messageId);
    const card = buildNewFeatureResultCard(result);
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();
  } catch (error) {
    return handleError('onNewFeature', error);
  }
}
```

3. **Add button in action card**:
```javascript
const action = CardService.newAction()
  .setFunctionName('onNewFeature')
  .setParameters({ messageId: messageId })
  .setLoadIndicator(CardService.LoadIndicator.SPINNER);

section.addWidget(
  CardService.newTextButton()
    .setText('New Feature')
    .setOnClickAction(action)
    .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
);
```

### Adding Scheduled Tasks

1. **Add preference constants** in Config.gs:
```javascript
const PREF_NEW_FEATURE_ENABLED = 'new_feature_enabled';
```

2. **Add to unified scheduler** in Scheduler.gs:
```javascript
function runScheduledTasks() {
  // ... existing tasks ...
  if (getPreference(PREF_NEW_FEATURE_ENABLED, false)) {
    runNewFeatureTask();
  }
}
```

## Common Patterns

### JSON Parsing from Claude

Claude sometimes wraps JSON in markdown code blocks:

```javascript
function parseClaudeJson(response) {
  let cleaned = response.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned);
}
```

### Rate Limiting Protection

```javascript
function withRetry(fn, options) {
  const { maxRetries = 3, initialDelay = 2000 } = options;
  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || i === maxRetries) throw error;
      Utilities.sleep(initialDelay * Math.pow(2, i));
    }
  }
}
```

### Timeout Protection

```javascript
function processWithTimeout(items, processFn, timeoutMs = 240000) {
  const startTime = Date.now();
  const results = [];

  for (const item of items) {
    if (Date.now() - startTime > timeoutMs) {
      Logger.log('Timeout reached, stopping gracefully');
      break;
    }
    results.push(processFn(item));
  }

  return results;
}
```

## Debugging

### Check API Key
```javascript
function checkApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  Logger.log(key ? 'API key is set (' + key.length + ' chars)' : 'API key NOT set');
}
```

### Test Claude Connection
```javascript
function testClaudeConnection() {
  try {
    const response = askClaude('Say "Hello" and nothing else.');
    Logger.log('Claude response: ' + response);
    return true;
  } catch (e) {
    Logger.log('Error: ' + e.message);
    return false;
  }
}
```

### Check Scheduler Status
```javascript
function getSchedulerStatus() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log('Triggers: ' + triggers.length);
  Logger.log('Auto-label: ' + getPreference(PREF_AUTO_LABEL_ENABLED, false));
  Logger.log('Digest: ' + getPreference(PREF_DIGEST_ENABLED, false));
}
```

### Clean Up Triggers
```javascript
function cleanupAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('All triggers removed');
}
```

## Common Gotchas

1. **Single trigger limit**: Use `Scheduler.gs`, never create direct triggers for features.

2. **Scope changes require full re-auth**:
   - Uninstall is NOT enough
   - Must revoke at https://myaccount.google.com/permissions
   - Then reinstall and re-authorize

3. **CardService icon errors**: Some combinations cause "Illegal argument". Valid icons:
   - `STAR`, `EMAIL`, `BOOKMARK`, `DESCRIPTION`, `CLOCK`, `INVITE`, `PERSON`
   - NOT valid: `NONE`, `CONFIRM` (despite documentation)

4. **Empty string errors**: `setBottomLabel('')` throws error - only call when value exists.

5. **Script Properties in add-on context**: Access directly, not through wrapper functions.

6. **Cache serialization**: Always `JSON.stringify()` objects before caching.

7. **6-minute timeout**: Long operations need batch processing and timeout checks.

8. **Trigger accumulation**: Always delete existing triggers before creating new ones.

## API Reference

### Claude Model
- Model: `claude-opus-4-5-20251101` (Opus 4.5)
- Max tokens: 4096
- Configured in `Config.gs`

### Google Services Used
- **GmailApp**: Read emails, create drafts, manage labels
- **CalendarApp**: Create events from detected meetings
- **LanguageApp**: Free translation (109 languages)
- **CacheService**: Per-user caching (6-hour default)
- **PropertiesService**: Script properties (API key), User properties (preferences)
- **UrlFetchApp**: External HTTP calls (Claude API)
- **ScriptApp**: Trigger management

## Testing Checklist

Before deploying changes:

- [ ] `clasp push` succeeds
- [ ] `testClaudeConnection()` passes
- [ ] `checkApiKey()` shows key is set
- [ ] Homepage card loads without errors
- [ ] Email context card loads
- [ ] At least one action (analyze/draft) works
- [ ] No "Illegal argument" CardService errors
- [ ] Scheduler status is correct
