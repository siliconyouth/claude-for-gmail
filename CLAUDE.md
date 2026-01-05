# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude for Gmail is a Google Apps Script Gmail Add-on that integrates Claude AI (Opus 4.5) for intelligent email assistance. It provides a sidebar UI within Gmail for summarizing emails, analyzing priority/sentiment, drafting replies, extracting action items, auto-labeling, and daily digests.

## Development Commands

```bash
# Push local changes to Google Apps Script
clasp push --force

# Pull remote changes from Google Apps Script
clasp pull

# Deploy a new version (for add-on publishing)
clasp deploy

# View logs
clasp logs

# Run a function
clasp run <functionName>
```

## Project Structure

```
├── src/
│   ├── Code.gs          # Main entry point, triggers, test functions
│   ├── Addon.gs         # Gmail Add-on UI (CardService cards and actions)
│   ├── Claude.gs        # Claude API integration with caching and retry
│   ├── Gmail.gs         # Gmail utilities (get emails, create drafts, labels)
│   ├── Config.gs        # Configuration, API key management, preferences
│   ├── Utils.gs         # Error handling, retry logic, caching utilities
│   ├── Scheduler.gs     # Unified scheduler (single trigger for all features)
│   ├── Labels.gs        # Smart auto-labeling system (15 categories)
│   ├── Digest.gs        # Daily email digest feature
│   └── Templates.gs     # Email templates with AI fill-in
├── appsscript.json      # Apps Script manifest with add-on config and OAuth scopes
├── .clasp.json          # clasp configuration (local only, gitignored)
└── .clasprc.json        # clasp credentials (local only, gitignored)
```

## Architecture

### Gmail Add-on UI (Addon.gs)
- **CardService**: All UI built with Google's CardService API
- **Trigger handlers**: `onHomepage()` for sidebar home, `onGmailMessage()` for email context
- **Action handlers**: `onAnalyzeEmail()`, `onDraftReplyStart()`, `onExtractActions()`, `onFullAnalysis()`
- **Automation handlers**: `onToggleAutoLabel()`, `onToggleDigest()`, `onSendDigestNow()`
- **Navigation**: Cards pushed onto stack via `CardService.newNavigation().pushCard()`

### Unified Scheduler (Scheduler.gs)
**Critical**: Add-ons are limited to **1 time-based trigger per user**. The unified scheduler solves this:
- Single `runScheduledTasks()` function runs hourly
- Checks user preferences to determine which features are enabled
- Runs auto-labeling every hour (if enabled)
- Runs daily digest at configured hour (if enabled, default 8 AM)
- Features enabled/disabled via `enableAutoLabel()`, `disableAutoLabel()`, `enableDigest()`, `disableDigest()`

### Core Functions
- **askClaude(prompt, systemPrompt)**: Base API call to Claude (with retry)
- **summarizeEmail(body, messageId)**: Returns concise summary (cached)
- **analyzeEmail(body, messageId)**: Returns {sentiment, priority, category, summary} (cached)
- **extractActionItems(body, messageId)**: Returns {tasks[], deadlines[], waitingOn[]} (cached)
- **generateReply(body, instructions)**: Returns draft reply text (not cached)
- **fullEmailAnalysis(body, messageId)**: Single API call for complete analysis (cached)

### Data Flow
```
Gmail Message → getEmailBody() → Claude API → CardService UI
                                           ↓
                              createReplyDraft() → Gmail Drafts
```

## Key Constraints

- **6-minute execution limit** per function (critical for digest)
- **1 trigger per user** for add-ons (use unified scheduler)
- `UrlFetchApp` is the only HTTP client
- No npm packages - all code must be self-contained
- CardService widgets have limited styling options
- Add-on context (`e.gmail.messageId`) only available in contextual triggers

## Add-on Deployment

### Test Deployment (Head)
1. Push code: `clasp push --force`
2. In Apps Script editor: Deploy → Test deployments → Install
3. Open Gmail and find "Claude for Gmail" in sidebar

### Re-authorization (after scope changes)
1. Go to https://myaccount.google.com/permissions
2. Find "Claude for Gmail" → Remove Access
3. In Apps Script: Deploy → Test deployments → Install
4. Open Gmail and authorize when prompted

### Production Deployment
1. Deploy → New deployment → Select type: Add-on
2. Fill in metadata and submit for review (if publishing to Marketplace)

## OAuth Scopes

The add-on requires these scopes (defined in appsscript.json):
- `gmail.modify` - Read/write emails and labels
- `gmail.addons.execute` - Run as Gmail add-on
- `gmail.addons.current.message.readonly` - Access current email
- `gmail.addons.current.action.compose` - Compose actions
- `script.external_request` - Call Claude API
- `script.scriptapp` - Manage triggers
- `userinfo.email` - Get user's email for digest sending

## Key Implementation Details

### Claude Model
- Uses `claude-opus-4-5-20251101` (Opus 4.5)
- Configured in `Config.gs` → `CONFIG.CLAUDE_MODEL`

### Caching (Utils.gs)
- Uses `CacheService.getUserCache()` for per-user caching
- Cache key format: `claude_gmail_analysis_{type}_{messageId}`
- Default expiration: 6 hours
- Caches: summaries, analysis, action items, full analysis
- Clear cache with `clearMessageCache(messageId)`

### Retry Logic (Utils.gs)
- `withRetry(fn, options)` - Exponential backoff
- Max 3 retries, delays from 1s to 30s
- Retries on: rate limits, network errors, API 500s
- Does NOT retry: auth errors, Gmail errors

### JSON Parsing (Utils.gs)
- `parseClaudeJson(response)` - Strips markdown code blocks
- Claude sometimes wraps JSON in ` ```json ... ``` ` blocks
- Must strip before `JSON.parse()` or parsing fails

### Digest Optimization (Digest.gs)
- Limited to 8 emails max (prevents timeout)
- 4-minute timeout protection with graceful exit
- Uses cached analysis when available
- Sends to user via `Session.getActiveUser().getEmail()`

## Common Gotchas

1. **Single trigger limit**: Add-ons can only have 1 time-based trigger per user. Use the unified scheduler in `Scheduler.gs` instead of separate triggers.

2. **Trigger minimum interval**: Time-based triggers must be at least 1 hour (not 30 min).

3. **OAuth scope changes require full re-auth**:
   - Uninstall test deployment is NOT enough
   - Must revoke at https://myaccount.google.com/permissions
   - Then reinstall and authorize

4. **Script Properties in add-on context**: Access `PropertiesService.getScriptProperties()` directly, not through wrapper functions. Add-on context can have different authorization.

5. **CardService icon issues**: Some DecoratedText + icon combinations cause "Illegal argument" errors. Use `TextParagraph` instead when issues arise.

6. **API key storage**: Use Project Settings → Script Properties in the Apps Script editor, not a function call.

7. **Execution timeout**: Long operations (like digest with many emails) can hit the 6-minute limit. Add timeout protection and limit batch sizes.

8. **Trigger accumulation**: Always delete existing triggers before creating new ones. Use `cleanupAllTriggers()` if you get "too many triggers" error.

## Debugging

### Check API Key
Run `checkApiKey()` from Apps Script editor to verify the API key is set.

### Check Triggers
Run `getSchedulerStatus()` to see which features are enabled and if the scheduler is running.

### Clean Up Triggers
Run `cleanupAllTriggers()` to remove all accumulated triggers.

### Test Claude Connection
Run `testClaudeConnection()` to verify the Claude API is working.

### View Logs
In Apps Script editor: View → Logs, or use `clasp logs` from terminal.
