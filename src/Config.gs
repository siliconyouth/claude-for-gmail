/**
 * Configuration and constants for Claude for Gmail
 */

const CONFIG = {
  CLAUDE_API_URL: 'https://api.anthropic.com/v1/messages',
  CLAUDE_MODEL: 'claude-sonnet-4-20250514',
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
 * @param {string} apiKey - Your Anthropic API key
 */
function setApiKey(apiKey) {
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
