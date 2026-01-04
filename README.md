# Claude for Gmail

A Google Apps Script that integrates Claude AI with Gmail for intelligent email assistance.

## Features

- **Email Summarization** - Get concise summaries of long emails
- **Reply Drafting** - Generate professional reply drafts with optional instructions
- **Email Analysis** - Automatic sentiment, priority, and category detection
- **Auto-labeling** - Organize emails with AI-generated priority labels

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (for clasp)
- [clasp](https://github.com/google/clasp) - Google Apps Script CLI
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

1. Install clasp globally:
   ```bash
   npm install -g @google/clasp
   ```

2. Login to clasp:
   ```bash
   clasp login
   ```

3. Create a new Apps Script project:
   ```bash
   clasp create --type standalone --title "Claude for Gmail"
   ```

4. Push the code:
   ```bash
   clasp push
   ```

5. Open the script and set your API key:
   ```bash
   clasp open
   ```
   Then run `setApiKey("your-anthropic-api-key")` in the Apps Script editor.

6. Test the connection:
   Run `testClaudeConnection()` to verify everything works.

## Usage

### Manual Processing

Run `processUnreadEmails()` to analyze and label unread emails.

### Automatic Processing

Run `setupTrigger()` once to set up hourly automatic processing.

### Individual Email Operations

```javascript
// Summarize a specific email
summarizeEmailById("message-id");

// Create a reply draft
createReplyDraftById("message-id", "Keep it brief and professional");
```

## Project Structure

```
├── src/
│   ├── Code.gs      # Main entry point and triggers
│   ├── Claude.gs    # Claude API integration
│   ├── Gmail.gs     # Gmail utilities
│   └── Config.gs    # Configuration
├── appsscript.json  # Apps Script manifest
└── README.md
```

## License

MIT
