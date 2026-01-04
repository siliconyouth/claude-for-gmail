# Claude for Gmail

A Gmail Add-on that integrates Claude AI for intelligent email assistance directly within Gmail.

## Features

- **📋 Summarize** - Get concise summaries of long emails
- **📊 Analyze** - Automatic priority, sentiment, and category detection
- **📝 Draft Reply** - AI-generated response drafts with tone selection
- **✅ Action Items** - Extract tasks, deadlines, and dependencies

## Screenshots

```
┌─────────────────────────────┐
│ 📧 Claude for Gmail         │
├─────────────────────────────┤
│ [🔍 Analyze Email]          │
│ [📝 Draft Reply]            │
│ [✅ Extract Action Items]   │
│ [📊 Full Analysis]          │
└─────────────────────────────┘
```

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (for clasp)
- [clasp](https://github.com/google/clasp) - Google Apps Script CLI
- [Anthropic API key](https://console.anthropic.com/)

### Installation

1. Install clasp globally:
   ```bash
   npm install -g @google/clasp
   ```

2. Login to clasp:
   ```bash
   clasp login
   ```

3. Enable Apps Script API at https://script.google.com/home/usersettings

4. Create a new Apps Script project:
   ```bash
   clasp create --type standalone --title "Claude for Gmail"
   ```

5. Push the code:
   ```bash
   clasp push --force
   ```

6. Set your API key in the Apps Script editor:
   - Go to Project Settings → Script Properties
   - Add property: `CLAUDE_API_KEY` with your Anthropic API key

### Install the Add-on

1. Open the Apps Script project in browser
2. Go to **Deploy → Test deployments**
3. Click **Install**
4. Open Gmail and find "Claude for Gmail" in the right sidebar

## Usage

1. Open any email in Gmail
2. Click the Claude for Gmail icon in the right sidebar
3. Choose an action:
   - **Analyze Email** - Get a summary
   - **Draft Reply** - Generate a reply with tone options
   - **Extract Action Items** - Find tasks and deadlines
   - **Full Analysis** - All of the above

## Project Structure

```
├── src/
│   ├── Code.gs      # Main entry point and triggers
│   ├── Addon.gs     # Gmail Add-on UI (CardService)
│   ├── Claude.gs    # Claude API integration
│   ├── Gmail.gs     # Gmail utilities
│   └── Config.gs    # Configuration
├── appsscript.json  # Apps Script manifest
└── README.md
```

## Development

```bash
# Push changes
clasp push --force

# View logs
clasp logs

# Pull remote changes
clasp pull
```

## License

MIT
