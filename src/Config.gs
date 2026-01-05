/**
 * Configuration and constants for Claude for Gmail
 */

const CONFIG = {
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  CLAUDE_MODEL: 'claude-opus-4-5-20251101',
  MAX_TOKENS: 4096,

  // Email processing limits
  MAX_EMAILS_PER_RUN: 10,
  MAX_EMAIL_LENGTH: 50000,
};

// User preference keys
const PREF_REPLY_TONE = 'reply_tone';
const PREF_REPLY_LENGTH = 'reply_length';
const PREF_INCLUDE_GREETING = 'include_greeting';
const PREF_INCLUDE_SIGNATURE = 'include_signature';
const PREF_SIGNATURE_TEXT = 'signature_text';

// Default values
const DEFAULT_REPLY_TONE = 'professional';
const DEFAULT_REPLY_LENGTH = 'concise';
const DEFAULT_INCLUDE_GREETING = true;
const DEFAULT_INCLUDE_SIGNATURE = true;
const DEFAULT_SIGNATURE_TEXT = '';

// Available options
const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'brief', label: 'Brief & Direct' }
];

const LENGTH_OPTIONS = [
  { value: 'concise', label: 'Concise (1-2 paragraphs)' },
  { value: 'detailed', label: 'Detailed (3-4 paragraphs)' },
  { value: 'brief', label: 'Brief (1-2 sentences)' }
];

const DIGEST_HOUR_OPTIONS = [
  { value: 6, label: '6:00 AM' },
  { value: 7, label: '7:00 AM' },
  { value: 8, label: '8:00 AM' },
  { value: 9, label: '9:00 AM' },
  { value: 10, label: '10:00 AM' },
  { value: 12, label: '12:00 PM' },
  { value: 18, label: '6:00 PM' }
];

/**
 * Get the Claude API key from script properties
 * @returns {string} The API key
 */
function getApiKey() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('CLAUDE_API_KEY');

  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY not set. Run setApiKey("your-key") first.');
  }

  return apiKey;
}

/**
 * Set the Claude API key in script properties
 * @param {string} apiKey - Your Anthropic API key (optional if using prompt)
 */
function setApiKey(apiKey) {
  // If no API key provided, prompt for it
  if (!apiKey) {
    const ui = SpreadsheetApp.getUi ? SpreadsheetApp.getUi() : null;
    if (ui) {
      const response = ui.prompt('Enter your Anthropic API key:');
      if (response.getSelectedButton() === ui.Button.OK) {
        apiKey = response.getResponseText();
      } else {
        Logger.log('API key setup cancelled');
        return;
      }
    } else {
      throw new Error('Please call setApiKey("your-api-key") with your key as argument');
    }
  }

  const props = PropertiesService.getScriptProperties();
  props.setProperty('CLAUDE_API_KEY', apiKey);
  Logger.log('API key saved successfully');
}

/**
 * Get a user preference from script properties
 * @param {string} key - The preference key
 * @param {*} defaultValue - Default value if not set
 * @returns {*} The preference value
 */
function getPreference(key, defaultValue) {
  const props = PropertiesService.getUserProperties();
  const value = props.getProperty(key);
  return value !== null ? JSON.parse(value) : defaultValue;
}

/**
 * Set a user preference in script properties
 * @param {string} key - The preference key
 * @param {*} value - The value to store
 */
function setPreference(key, value) {
  const props = PropertiesService.getUserProperties();
  props.setProperty(key, JSON.stringify(value));
}
