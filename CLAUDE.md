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
│   ├── Code.gs          # Main entry point and Gmail triggers
│   ├── Claude.gs        # Claude API integration
│   ├── Gmail.gs         # Gmail-specific utilities
│   └── Config.gs        # Configuration and constants
├── appsscript.json      # Apps Script manifest
├── .clasp.json          # clasp configuration (local only)
└── .clasprc.json        # clasp credentials (local only, gitignored)
```

## Architecture

- **Trigger-based execution**: Uses Gmail add-on triggers or time-based triggers to process emails
- **Claude API calls**: Makes HTTP requests to Anthropic API via `UrlFetchApp`
- **Script Properties**: Stores API keys and user preferences securely

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
