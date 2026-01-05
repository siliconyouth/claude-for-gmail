# Claude for Gmail

A powerful Gmail Add-on that integrates Claude AI (Opus 4.5) for intelligent email assistance directly within Gmail. Features include email summarization, smart replies, translation in 100+ languages, calendar integration, contact insights, and an AI-powered priority inbox.

![Claude for Gmail](https://raw.githubusercontent.com/siliconyouth/claude-for-gmail/main/assets/logo.png)

## Features

### Core AI Features
| Feature | Description |
|---------|-------------|
| **Summarize** | Get concise summaries of long emails in seconds |
| **Analyze** | Automatic priority, sentiment, and category detection |
| **Draft Reply** | AI-generated response drafts with customizable tone |
| **Action Items** | Extract tasks, deadlines, and dependencies |
| **Full Analysis** | Complete email analysis in a single view |

### Advanced Features
| Feature | Description |
|---------|-------------|
| **Thread Analysis** | Summarize entire email threads, track decisions and open questions |
| **Translation** | Translate emails to/from 100+ languages (Google Translate, free) |
| **Follow-up Detection** | Know when an email needs a response and suggested timeframe |
| **Meeting Detection** | Extract event details, attendees, and proposed times |
| **Smart Labels** | Auto-categorize emails with AI-powered labels (15 categories) |
| **Calendar Integration** | Create Google Calendar events from detected meetings |
| **Contact Insights** | View sender history, relationship, and communication patterns |
| **Attachment Summary** | AI-powered summaries of PDF and document attachments |

### Productivity Features
| Feature | Description |
|---------|-------------|
| **Email Scheduling** | Schedule emails to send at a specific time |
| **Priority Inbox** | AI-sorted email dashboard showing what matters most |
| **Snooze/Remind** | Snooze emails and get reminded at the right time |
| **Daily Digest** | Morning summary of important emails at your chosen time |
| **Smart Compose** | AI writing suggestions as you type |
| **Templates** | 20+ pre-built templates with AI-powered placeholder filling |

### Technical Features
| Feature | Description |
|---------|-------------|
| **Offline Caching** | Access recent analyses without internet |
| **Usage Analytics** | Track which features you use most |
| **Onboarding Flow** | Guided setup for new users |
| **Error Recovery** | Graceful error handling with helpful messages |

## Screenshots

```
+----------------------------------+
|  Claude for Gmail                |
|  AI-powered email assistance     |
+----------------------------------+
| QUICK ACTIONS                    |
| [Analyze Email]                  |
| [Draft Reply]                    |
| [Extract Action Items]           |
| [Full Analysis]                  |
+----------------------------------+
| ADVANCED                         |
| > Analyze Thread                 |
| > Translate (100+ languages)     |
| > Follow-up Check                |
| > Detect Meeting                 |
+----------------------------------+
| MORE                             |
| > Use Template                   |
| > Apply Smart Labels             |
| > Schedule Email                 |
| > Contact Insights               |
+----------------------------------+
```

## Installation

### Prerequisites

- Google Account with Gmail
- [Node.js](https://nodejs.org/) (for clasp CLI)
- [clasp](https://github.com/google/clasp) - Google Apps Script CLI
- [Anthropic API key](https://console.anthropic.com/) for Claude AI

### Quick Start

1. **Install clasp globally:**
   ```bash
   npm install -g @google/clasp
   ```

2. **Login to clasp:**
   ```bash
   clasp login
   ```

3. **Enable Apps Script API:**
   Visit https://script.google.com/home/usersettings and enable the API

4. **Clone and setup:**
   ```bash
   git clone https://github.com/siliconyouth/claude-for-gmail.git
   cd claude-for-gmail
   clasp create --type standalone --title "Claude for Gmail"
   ```

5. **Push the code:**
   ```bash
   clasp push --force
   ```

6. **Configure API key:**
   - Open Apps Script editor: `clasp open`
   - Go to **Project Settings** (gear icon)
   - Scroll to **Script Properties**
   - Add property: `CLAUDE_API_KEY` = your Anthropic API key

7. **Install the add-on:**
   - In Apps Script editor: **Deploy → Test deployments**
   - Click **Install**
   - Open Gmail and find "Claude for Gmail" in the right sidebar

## Usage

### Basic Usage

1. Open any email in Gmail
2. Click the Claude for Gmail icon in the right sidebar
3. Choose an action:
   - **Analyze Email** - Get summary, priority, and sentiment
   - **Draft Reply** - Generate a reply with tone options
   - **Extract Action Items** - Find tasks and deadlines
   - **Full Analysis** - Complete analysis in one view

### Translation

1. Open an email in any language
2. Click **Translate** in the Advanced section
3. Auto-detects the source language
4. Choose from 100+ target languages
5. View translation instantly (powered by Google Translate - free!)

### Calendar Integration

1. Open an email with meeting details
2. Click **Detect Meeting**
3. Review extracted: title, date/time, attendees, location
4. Click **Create Calendar Event** to add to Google Calendar

### Smart Labels

Enable auto-labeling to automatically categorize emails:
- **Priority**: High / Medium / Low
- **Category**: Meeting, Request, Info, Sales, Support, Newsletter, Personal, Finance
- **Status**: NeedsReply, WaitingOn, FYI

### Daily Digest

Enable daily digest to receive a morning summary:
1. Go to add-on homepage
2. Toggle **Daily Digest** on
3. Choose your preferred time in Settings
4. Receive AI summaries of important emails each morning

## Project Structure

```
claude-for-gmail/
├── src/
│   ├── Code.gs          # Main entry point, triggers
│   ├── Addon.gs         # Gmail Add-on UI (CardService)
│   ├── Claude.gs        # Claude API integration
│   ├── Gmail.gs         # Gmail utilities
│   ├── Config.gs        # Configuration and preferences
│   ├── Utils.gs         # Error handling, caching, retry
│   ├── Scheduler.gs     # Unified scheduler for automation
│   ├── Labels.gs        # Smart auto-labeling (15 categories)
│   ├── Digest.gs        # Daily email digest
│   ├── Templates.gs     # Email templates with AI fill-in
│   ├── Translation.gs   # Google Translate (100+ languages)
│   ├── Calendar.gs      # Google Calendar integration
│   ├── Contacts.gs      # Contact insights
│   ├── Attachments.gs   # Attachment analysis
│   ├── Scheduling.gs    # Email scheduling
│   ├── Priority.gs      # Priority inbox
│   ├── Snooze.gs        # Snooze/remind feature
│   ├── Analytics.gs     # Usage analytics
│   └── Onboarding.gs    # First-time user setup
├── assets/
│   ├── logo.svg         # Add-on logo (SVG source)
│   └── logo.png         # Add-on logo (PNG for Gmail)
├── appsscript.json      # Apps Script manifest
├── .clasp.json          # clasp config (gitignored)
├── CLAUDE.md            # Development guide for AI assistants
└── README.md            # This file
```

## Development

### Commands

```bash
# Push changes to Google Apps Script
clasp push

# Push and overwrite (force)
clasp push --force

# Pull remote changes
clasp pull

# View execution logs
clasp logs

# Open in browser
clasp open

# Deploy new version
clasp deploy
```

### Running Tests

```bash
# In Apps Script editor, run:
testClaudeConnection()    # Test Claude API
checkApiKey()             # Verify API key is set
getSchedulerStatus()      # Check automation status
```

### Debugging

1. **View Logs**: Apps Script editor → Execution log
2. **Check Triggers**: Run `getSchedulerStatus()`
3. **Clear Cache**: Run `clearAllCache()`
4. **Reset Triggers**: Run `cleanupAllTriggers()`

## Configuration

### Settings Available

| Setting | Options | Default |
|---------|---------|---------|
| Reply Tone | Professional, Friendly, Formal, Casual, Brief | Professional |
| Reply Length | Concise, Detailed, Brief | Concise |
| Include Greeting | Yes/No | Yes |
| Include Signature | Yes/No | Yes |
| Custom Signature | Text | (empty) |
| Digest Time | 6 AM - 6 PM | 8 AM |

### API Configuration

The add-on uses:
- **Claude API**: Opus 4.5 model for AI features
- **Google Translate**: Free LanguageApp for translation
- **Google Calendar API**: For calendar integration
- **Gmail API**: For email operations

## Supported Languages (Translation)

Over 100 languages including:

**European**: English, Spanish, French, German, Italian, Portuguese, Russian, Ukrainian, Polish, Dutch, Swedish, Norwegian, Danish, Finnish, Greek, Romanian, Hungarian, Czech, Slovak, Bulgarian, Croatian, Serbian, and more.

**Asian**: Chinese (Simplified & Traditional), Japanese, Korean, Vietnamese, Thai, Indonesian, Malay, Hindi, Bengali, Tamil, Telugu, Marathi, and more.

**Middle Eastern**: Arabic, Hebrew, Persian, Turkish, Kurdish, Pashto.

**African**: Swahili, Amharic, Hausa, Yoruba, Zulu, Xhosa, and more.

## Privacy & Security

- **API Key**: Stored securely in Google Apps Script properties
- **Email Data**: Processed only when you click an action
- **No Storage**: Email content is not stored outside of caching
- **Cache**: Temporary cache expires after 6 hours
- **Permissions**: Minimal OAuth scopes required

## Troubleshooting

### "API Key not set" error
1. Open Apps Script editor: `clasp open`
2. Go to Project Settings → Script Properties
3. Add `CLAUDE_API_KEY` with your Anthropic API key

### Add-on not appearing in Gmail
1. Ensure you installed via Deploy → Test deployments → Install
2. Refresh Gmail
3. Check for the icon in the right sidebar

### "Too many triggers" error
Run `cleanupAllTriggers()` in the Apps Script editor

### Translation not working
Google Translate is built-in and free - no API key needed. Check:
1. Internet connection
2. Text isn't too long (limit: ~5000 chars per request)

### Calendar event not created
Ensure you've granted calendar permissions when prompted

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude AI
- [Google](https://developers.google.com/apps-script) for Apps Script platform
- [clasp](https://github.com/google/clasp) for the CLI tool

---

**Made with AI** - Built using Claude Code
