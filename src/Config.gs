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
