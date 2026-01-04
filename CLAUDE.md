# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude for Gmail is a Google Apps Script project that integrates Claude AI with Gmail for intelligent email assistance.

## Development Commands

```bash
# Push local changes to Google Apps Script
clasp push

# Pull remote changes from Google Apps Script
clasp pull

# Open the Apps Script project in browser
clasp open

# Deploy a new version
clasp deploy

# View logs
clasp logs

# Run a function
clasp run <functionName>
```

## Project Structure

```
├── src/
│   ├── Code.gs          # Main entry point, triggers, and menu handlers
│   ├── Claude.gs        # Claude API integration (askClaude, summarize, analyze)
│   ├── Gmail.gs         # Gmail utilities (get emails, create drafts, labels)
│   └── Config.gs        # Configuration, API key management, preferences
├── appsscript.json      # Apps Script manifest with OAuth scopes
├── .clasp.json          # clasp configuration (local only, gitignored)
└── .clasprc.json        # clasp credentials (local only, gitignored)
```

## Architecture

- **Trigger-based execution**: Time-driven triggers via `setupTrigger()` for automatic processing
- **Claude API calls**: HTTP requests to Anthropic API via `UrlFetchApp` with proper headers
- **Script Properties**: `PropertiesService.getScriptProperties()` for API key, `getUserProperties()` for preferences
- **Modular design**: Separation of concerns between Claude integration, Gmail operations, and configuration

## Key Constraints

- Apps Script has a 6-minute execution time limit per function
- `UrlFetchApp` is the only way to make HTTP requests
- No npm packages - all dependencies must be included directly or use Apps Script libraries
- Use `PropertiesService.getScriptProperties()` for sensitive configuration

## Testing

Apps Script doesn't have built-in testing. Test functions locally by:
1. Creating test functions prefixed with `test_`
2. Running via `clasp run test_<functionName>`
3. Checking execution logs with `clasp logs`
