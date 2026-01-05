<p align="center">
  <img src="assets/logo.png" alt="Claude for Gmail" width="128" height="128">
</p>

<h1 align="center">Claude for Gmail</h1>

<p align="center">
  <strong>AI-powered email assistant for Gmail using Claude Opus 4.5</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#development">Development</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Google%20Apps%20Script-4285F4?style=flat-square&logo=google&logoColor=white" alt="Platform">
  <img src="https://img.shields.io/badge/AI-Claude%20Opus%204.5-D97706?style=flat-square&logo=anthropic&logoColor=white" alt="AI Model">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Languages-100+-blue?style=flat-square" alt="Languages">
</p>

---

A comprehensive Gmail Add-on that brings the power of Claude AI directly into your inbox. Summarize emails, draft intelligent replies, detect security threats, translate messages in 100+ languages, and automate your email workflow — all without leaving Gmail.

## Features

### Core AI Features

| Feature | Description |
|:--------|:------------|
| **Summarize** | Get concise summaries of long emails in seconds |
| **Analyze** | Automatic priority, sentiment, and category detection |
| **Draft Reply** | AI-generated responses with customizable tone |
| **Action Items** | Extract tasks, deadlines, and dependencies |
| **Full Analysis** | Complete email breakdown in a single view |

### Security & Protection

| Feature | Description |
|:--------|:------------|
| **AI Security Scan** | Detect phishing, scams, and spam with AI analysis |
| **Bulk Threat Scan** | Scan 10-50 inbox messages with cached results |
| **Quick Threat Check** | Rule-based instant threat assessment |
| **Report Phishing/Spam** | One-click reporting with automatic labeling |
| **Sender Whitelist** | Trust known senders to skip security checks |

### Advanced Email Tools

| Feature | Description |
|:--------|:------------|
| **Thread Analysis** | Summarize entire conversations, track decisions |
| **Translation** | 100+ languages via Google Translate (free) |
| **Follow-up Detection** | Know when emails need responses |
| **Meeting Detection** | Extract event details and attendees |
| **Smart Labels** | Auto-categorize with 15 AI-powered labels |
| **Calendar Integration** | Create events from detected meetings |
| **Contact Insights** | View sender history and patterns |
| **Attachment Summary** | AI summaries of PDFs and documents |

### Productivity & Automation

| Feature | Description |
|:--------|:------------|
| **Email Scheduling** | Send emails at specific times |
| **Priority Inbox** | AI-sorted dashboard of important emails |
| **Snooze/Remind** | Snooze emails for later reminders |
| **Daily Digest** | Morning summary at your chosen time |
| **Smart Compose** | AI writing suggestions as you type |
| **Templates** | 20+ templates with AI placeholder filling |
| **Bulk Actions** | Archive old emails, mark all read, inbox summary |

### Technical Features

| Feature | Description |
|:--------|:------------|
| **Offline Caching** | Access recent analyses without internet |
| **Security Cache** | Skip re-scanning previously checked emails |
| **Usage Analytics** | Track feature usage patterns |
| **Guided Onboarding** | Step-by-step setup wizard |
| **Error Recovery** | Graceful handling with helpful messages |

---

## Installation

### Prerequisites

- Google Account with Gmail
- [Node.js](https://nodejs.org/) (for clasp CLI)
- [Anthropic API key](https://console.anthropic.com/)

### Quick Start

```bash
# 1. Install clasp globally
npm install -g @google/clasp

# 2. Login to Google
clasp login

# 3. Enable Apps Script API
# Visit: https://script.google.com/home/usersettings

# 4. Clone the repository
git clone https://github.com/siliconyouth/claude-for-gmail.git
cd claude-for-gmail

# 5. Create Apps Script project
clasp create --type standalone --title "Claude for Gmail"

# 6. Push the code
clasp push --force

# 7. Open Apps Script editor
clasp open
```

### Configure API Key

1. In Apps Script editor, click **Project Settings** (gear icon)
2. Scroll to **Script Properties**
3. Add new property:
   - **Property**: `CLAUDE_API_KEY`
   - **Value**: Your Anthropic API key

### Install the Add-on

1. In Apps Script editor: **Deploy → Test deployments**
2. Click **Install**
3. Open Gmail — find "Claude for Gmail" in the right sidebar

---

## Usage

### Basic Workflow

1. **Open any email** in Gmail
2. **Click the Claude icon** in the right sidebar
3. **Choose an action**:
   - Analyze Email — summary, priority, sentiment
   - Draft Reply — AI response with tone options
   - Extract Action Items — tasks and deadlines
   - Security Scan — check for threats

### Security Scanning

```
Dashboard → Security section
├── Quick Check — Instant rule-based analysis
├── AI Deep Scan — Full Claude-powered analysis
└── Report as Phishing/Spam — Label and move to spam

Bulk Actions → Scan Inbox for Threats
├── 10 messages — Quick scan (~30 sec)
├── 20 messages — Standard scan (~1 min)
├── 35 messages — Extended scan (~2 min)
└── 50 messages — Full scan (~3 min)
```

### Translation

- Auto-detects source language
- Supports 100+ target languages
- Powered by Google Translate (free)

### Smart Labels

Enable auto-labeling to categorize emails automatically:

| Category | Labels |
|:---------|:-------|
| **Priority** | High, Medium, Low |
| **Type** | Meeting, Request, Info, Sales, Support, Newsletter |
| **Status** | NeedsReply, WaitingOn, FYI |

### Daily Digest

Receive AI-powered morning summaries:
1. Toggle **Daily Digest** in settings
2. Choose delivery time (6 AM – 6 PM)
3. Get prioritized email summaries each morning

---

## Project Structure

```
claude-for-gmail/
├── src/
│   ├── Addon.gs         # Gmail Add-on UI (CardService)
│   ├── Claude.gs        # Claude API integration
│   ├── Security.gs      # Threat detection & scanning
│   ├── Gmail.gs         # Gmail utilities
│   ├── Config.gs        # Configuration & preferences
│   ├── Utils.gs         # Error handling, caching, retry
│   ├── Scheduler.gs     # Unified task scheduler
│   ├── Labels.gs        # Smart auto-labeling
│   ├── Digest.gs        # Daily email digest
│   ├── Templates.gs     # Email templates
│   ├── Translation.gs   # Google Translate (100+ languages)
│   ├── Calendar.gs      # Calendar integration
│   ├── Contacts.gs      # Contact insights
│   ├── Attachments.gs   # Document summarization
│   ├── Scheduling.gs    # Email send scheduling
│   ├── Priority.gs      # Priority inbox
│   ├── Snooze.gs        # Snooze/remind feature
│   ├── SmartCompose.gs  # AI writing suggestions
│   ├── Analytics.gs     # Usage tracking
│   ├── OfflineCache.gs  # Offline access
│   ├── Onboarding.gs    # Setup wizard
│   └── Code.gs          # Entry point & tests
├── assets/
│   ├── logo.svg         # Logo source
│   └── logo.png         # Gmail add-on icon
├── appsscript.json      # Apps Script manifest
├── CLAUDE.md            # AI development guide
├── LICENSE              # MIT License
└── README.md            # This file
```

---

## Development

### Commands

```bash
clasp push           # Push changes
clasp push --force   # Force push (overwrite)
clasp pull           # Pull remote changes
clasp logs           # View execution logs
clasp open           # Open in browser
clasp deploy         # Deploy new version
```

### Testing

```javascript
// In Apps Script editor, run:
testClaudeConnection()    // Test Claude API
checkApiKey()             // Verify API key
getSchedulerStatus()      // Check automation
```

### Debugging

| Issue | Solution |
|:------|:---------|
| API Key not set | Add `CLAUDE_API_KEY` in Script Properties |
| Add-on not visible | Deploy → Test deployments → Install |
| Too many triggers | Run `cleanupAllTriggers()` |
| Cache issues | Run `clearAllCache()` |

---

## Configuration

### Settings

| Setting | Options | Default |
|:--------|:--------|:--------|
| Reply Tone | Professional, Friendly, Formal, Casual, Brief | Professional |
| Reply Length | Concise, Detailed, Brief | Concise |
| Include Greeting | Yes / No | Yes |
| Include Signature | Yes / No | Yes |
| Digest Time | 6 AM – 6 PM | 8 AM |

### API Services

| Service | Purpose | Cost |
|:--------|:--------|:-----|
| Claude API | AI analysis & generation | Paid (Anthropic) |
| Google Translate | Translation | Free |
| Gmail API | Email operations | Free |
| Calendar API | Event creation | Free |

---

## Supported Languages

**100+ languages** including:

- **European**: English, Spanish, French, German, Italian, Portuguese, Russian, Ukrainian, Polish, Dutch, Swedish, Norwegian, Danish, Finnish, Greek, and more
- **Asian**: Chinese (Simplified/Traditional), Japanese, Korean, Vietnamese, Thai, Hindi, Bengali, Tamil, Indonesian, and more
- **Middle Eastern**: Arabic, Hebrew, Persian, Turkish, Kurdish
- **African**: Swahili, Amharic, Hausa, Yoruba, Zulu, and more

---

## Privacy & Security

- **API Key**: Stored securely in Google Apps Script properties
- **Email Data**: Processed only when you trigger an action
- **No Storage**: Email content is not permanently stored
- **Cache**: Temporary cache expires after 6 hours
- **Security Cache**: Threat scan results cached for 7 days
- **Permissions**: Minimal OAuth scopes required

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Vladimir Dukelic**

- Email: [vladimir@dukelic.com](mailto:vladimir@dukelic.com)
- GitHub: [@siliconyouth](https://github.com/siliconyouth)

---

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude AI
- [Google](https://developers.google.com/apps-script) for Apps Script platform
- [clasp](https://github.com/google/clasp) for the CLI tool

---

<p align="center">
  <sub>Built with Claude Code</sub>
</p>
