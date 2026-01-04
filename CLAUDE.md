# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude for Gmail is a Google Apps Script Gmail Add-on that integrates Claude AI for intelligent email assistance. It provides a sidebar UI within Gmail for summarizing emails, analyzing priority/sentiment, drafting replies, and extracting action items.

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
│   ├── Code.gs          # Main entry point, triggers, menu handlers
│   ├── Addon.gs         # Gmail Add-on UI (CardService cards and actions)
│   ├── Claude.gs        # Claude API integration (askClaude, summarize, analyze, extractActionItems)
│   ├── Gmail.gs         # Gmail utilities (get emails, create drafts, labels)
│   └── Config.gs        # Configuration, API key management, preferences
├── appsscript.json      # Apps Script manifest with add-on config and OAuth scopes
├── .clasp.json          # clasp configuration (local only, gitignored)
└── .clasprc.json        # clasp credentials (local only, gitignored)
```

## Architecture

### Gmail Add-on UI (Addon.gs)
- **CardService**: All UI built with Google's CardService API
- **Trigger handlers**: `onHomepage()` for sidebar home, `onGmailMessage()` for email context
- **Action handlers**: `onAnalyzeEmail()`, `onDraftReplyStart()`, `onExtractActions()`, `onFullAnalysis()`
- **Navigation**: Cards pushed onto stack via `CardService.newNavigation().pushCard()`

### Core Functions
- **askClaude(prompt, systemPrompt)**: Base API call to Claude
- **summarizeEmail(body)**: Returns concise summary
- **analyzeEmail(body)**: Returns {sentiment, priority, category, summary}
- **extractActionItems(body)**: Returns {tasks[], deadlines[], waitingOn[]}
- **generateReply(body, instructions)**: Returns draft reply text

### Data Flow
```
Gmail Message → getEmailBody() → Claude API → CardService UI
                                           ↓
                              createReplyDraft() → Gmail Drafts
```

## Key Constraints

- Apps Script 6-minute execution limit per function
- `UrlFetchApp` is the only HTTP client
- No npm packages - all code must be self-contained
- CardService widgets have limited styling options
- Add-on context (`e.gmail.messageId`) only available in contextual triggers

## Add-on Deployment

### Test Deployment (Head)
1. Push code: `clasp push --force`
2. In Apps Script editor: Deploy → Test deployments → Install
3. Open Gmail and find "Claude for Gmail" in sidebar

### Production Deployment
1. Deploy → New deployment → Select type: Add-on
2. Fill in metadata and submit for review (if publishing to Marketplace)

## OAuth Scopes

The add-on requires these scopes (defined in appsscript.json):
- `gmail.readonly` - Read email content
- `gmail.compose` - Create draft replies
- `gmail.addons.execute` - Run as Gmail add-on
- `gmail.addons.current.message.readonly` - Access current email
- `script.external_request` - Call Claude API
