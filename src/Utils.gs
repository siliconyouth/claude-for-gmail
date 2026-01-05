/**
 * Utility functions for error handling, retries, and caching
 */

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Custom error types for better error handling
 */
const ErrorType = {
  API_ERROR: 'API_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  AUTH_ERROR: 'AUTH_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  GMAIL_ERROR: 'GMAIL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Parse an error and return a user-friendly message
 * @param {Error} error - The error object
 * @returns {Object} Object with type, message, and isRetryable
 */
function parseError(error) {
  const message = error.message || String(error);

  // API rate limit
  if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: 'Too many requests. Please wait a moment and try again.',
      isRetryable: true,
      retryAfter: 30000
    };
  }

  // Authentication errors
  if (message.includes('401') || message.includes('403') || message.includes('API key') || message.includes('unauthorized')) {
    return {
      type: ErrorType.AUTH_ERROR,
      message: 'API key error. Please check your Claude API key in Script Properties.',
      isRetryable: false
    };
  }

  // Network errors
  if (message.includes('timeout') || message.includes('network') || message.includes('ECONNREFUSED') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network error. Please check your connection and try again.',
      isRetryable: true,
      retryAfter: 5000
    };
  }

  // Gmail errors
  if (message.includes('Gmail') || message.includes('message not found') || message.includes('thread')) {
    return {
      type: ErrorType.GMAIL_ERROR,
      message: 'Gmail error. The email may have been moved or deleted.',
      isRetryable: false
    };
  }

  // API errors (400, 500, etc.)
  if (message.includes('Claude API error') || message.includes('400') || message.includes('500')) {
    return {
      type: ErrorType.API_ERROR,
      message: 'AI service error. Please try again in a moment.',
      isRetryable: true,
      retryAfter: 5000
    };
  }

  // Default unknown error
  return {
    type: ErrorType.UNKNOWN_ERROR,
    message: 'Something went wrong. Please try again.',
    isRetryable: true,
    retryAfter: 3000
  };
}

/**
 * Log error with context for debugging
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 */
function logError(context, error) {
  const parsed = parseError(error);
  Logger.log(`[${parsed.type}] ${context}: ${error.message}`);
  if (error.stack) {
    Logger.log(`Stack: ${error.stack}`);
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Execute a function with retry logic and exponential backoff
 * @param {Function} fn - Function to execute
 * @param {Object} options - Retry options
 * @returns {*} Result of the function
 */
function withRetry(fn, options) {
  const defaults = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    onRetry: null
  };

  const config = Object.assign({}, defaults, options || {});
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      const parsed = parseError(error);

      // Don't retry non-retryable errors
      if (!parsed.isRetryable) {
        throw error;
      }

      // Don't retry after max attempts
      if (attempt >= config.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );

      // Use server-suggested retry delay if available
      if (parsed.retryAfter) {
        delay = Math.max(delay, parsed.retryAfter);
      }

      // Log retry attempt
      Logger.log(`Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms: ${error.message}`);

      // Callback for retry notification
      if (config.onRetry) {
        config.onRetry(attempt + 1, config.maxRetries, delay);
      }

      // Wait before retrying
      Utilities.sleep(delay);
    }
  }

  throw lastError;
}

// ============================================================================
// CACHING
// ============================================================================

/**
 * Cache keys prefix
 */
const CACHE_PREFIX = 'claude_gmail_';

/**
 * Default cache expiration (6 hours in seconds)
 */
const DEFAULT_CACHE_EXPIRATION = 6 * 60 * 60;

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {*} Cached value or null
 */
function getCached(key) {
  try {
    const cache = CacheService.getUserCache();
    const cached = cache.get(CACHE_PREFIX + key);

    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    Logger.log('Cache get error: ' + error.message);
  }

  return null;
}

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} expiration - Expiration in seconds (default: 6 hours)
 */
function setCached(key, value, expiration) {
  try {
    const cache = CacheService.getUserCache();
    cache.put(
      CACHE_PREFIX + key,
      JSON.stringify(value),
      expiration || DEFAULT_CACHE_EXPIRATION
    );
  } catch (error) {
    Logger.log('Cache set error: ' + error.message);
  }
}

/**
 * Remove cached value
 * @param {string} key - Cache key
 */
function removeCached(key) {
  try {
    const cache = CacheService.getUserCache();
    cache.remove(CACHE_PREFIX + key);
  } catch (error) {
    Logger.log('Cache remove error: ' + error.message);
  }
}

/**
 * Get or compute cached value
 * @param {string} key - Cache key
 * @param {Function} computeFn - Function to compute value if not cached
 * @param {number} expiration - Cache expiration in seconds
 * @returns {*} Cached or computed value
 */
function getOrCompute(key, computeFn, expiration) {
  const cached = getCached(key);

  if (cached !== null) {
    Logger.log('Cache hit: ' + key);
    return cached;
  }

  Logger.log('Cache miss: ' + key);
  const value = computeFn();
  setCached(key, value, expiration);
  return value;
}

/**
 * Generate cache key for email analysis
 * @param {string} messageId - Gmail message ID
 * @param {string} analysisType - Type of analysis
 * @returns {string} Cache key
 */
function getAnalysisCacheKey(messageId, analysisType) {
  return `analysis_${analysisType}_${messageId}`;
}

/**
 * Clear all cached analyses for a message
 * @param {string} messageId - Gmail message ID
 */
function clearMessageCache(messageId) {
  const types = ['summary', 'analysis', 'actions', 'full'];
  types.forEach(function(type) {
    removeCached(getAnalysisCacheKey(messageId, type));
  });
}

// ============================================================================
// LOADING STATE HELPERS
// ============================================================================

/**
 * Show a loading notification
 * @param {string} message - Loading message
 * @returns {ActionResponse}
 */
function showLoadingNotification(message) {
  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification()
        .setText(message || 'Processing...')
    )
    .build();
}

/**
 * Wrap an async operation with loading state
 * Note: Apps Script doesn't support true async, but this helps structure code
 * @param {string} loadingMessage - Message to show while loading
 * @param {Function} operation - The operation to perform
 * @param {Function} onSuccess - Called with result on success
 * @param {Function} onError - Called with error on failure
 */
function withLoadingState(loadingMessage, operation, onSuccess, onError) {
  try {
    const result = operation();
    return onSuccess(result);
  } catch (error) {
    logError('Operation failed', error);
    return onError(error);
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that API key is set
 * @throws {Error} If API key is not set
 */
function validateApiKey() {
  try {
    getApiKey();
  } catch (error) {
    throw new Error('API key not configured. Go to Project Settings → Script Properties and add CLAUDE_API_KEY.');
  }
}

/**
 * Validate message ID and return message
 * @param {string} messageId - Gmail message ID
 * @returns {GmailMessage} The Gmail message
 * @throws {Error} If message not found
 */
function validateAndGetMessage(messageId) {
  if (!messageId) {
    throw new Error('No email selected. Please open an email first.');
  }

  const message = GmailApp.getMessageById(messageId);

  if (!message) {
    throw new Error('Email not found. It may have been moved or deleted.');
  }

  return message;
}

/**
 * Parse JSON from Claude response, handling markdown code blocks
 * @param {string} response - Claude's response text
 * @returns {Object} Parsed JSON object
 * @throws {Error} If parsing fails
 */
function parseClaudeJson(response) {
  let jsonStr = response.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }

  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  jsonStr = jsonStr.trim();

  return JSON.parse(jsonStr);
}
