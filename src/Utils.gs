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

// ============================================================================
// ENHANCED ERROR HANDLING
// ============================================================================

/**
 * Error log storage key
 */
const PREF_ERROR_LOG = 'error_log';
const MAX_ERROR_LOG_SIZE = 50;

/**
 * Circuit breaker state
 */
const CIRCUIT_BREAKER_KEY = 'circuit_breaker';
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Track an error for analytics and debugging
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 * @param {Object} metadata - Additional context
 */
function trackError(context, error, metadata) {
  try {
    const errorLog = getPreference(PREF_ERROR_LOG, []);
    const parsed = parseError(error);

    const errorEntry = {
      timestamp: new Date().toISOString(),
      context: context,
      type: parsed.type,
      message: error.message,
      metadata: metadata || {},
      stack: error.stack ? error.stack.substring(0, 500) : null
    };

    errorLog.unshift(errorEntry);

    // Keep only recent errors
    if (errorLog.length > MAX_ERROR_LOG_SIZE) {
      errorLog.length = MAX_ERROR_LOG_SIZE;
    }

    setPreference(PREF_ERROR_LOG, errorLog);

    // Log to console
    logError(context, error);

    // Update circuit breaker if API error
    if (parsed.type === ErrorType.API_ERROR || parsed.type === ErrorType.RATE_LIMIT) {
      updateCircuitBreaker(true);
    }

  } catch (e) {
    // Silently fail - don't break user experience for error tracking
    Logger.log('Error tracking failed: ' + e.message);
  }
}

/**
 * Get recent errors for debugging
 * @param {number} limit - Number of errors to return
 * @returns {Array} Recent errors
 */
function getRecentErrors(limit) {
  const errors = getPreference(PREF_ERROR_LOG, []);
  return errors.slice(0, limit || 10);
}

/**
 * Clear error log
 */
function clearErrorLog() {
  setPreference(PREF_ERROR_LOG, []);
}

/**
 * Get error statistics
 * @returns {Object} Error stats
 */
function getErrorStats() {
  const errors = getPreference(PREF_ERROR_LOG, []);

  if (errors.length === 0) {
    return { totalErrors: 0, byType: {}, recentRate: 0 };
  }

  // Count by type
  const byType = {};
  errors.forEach(function(e) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  });

  // Calculate recent error rate (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentErrors = errors.filter(function(e) {
    return new Date(e.timestamp) > oneHourAgo;
  });

  return {
    totalErrors: errors.length,
    byType: byType,
    recentCount: recentErrors.length,
    recentRate: recentErrors.length / 60 // errors per minute
  };
}

// ============================================================================
// CIRCUIT BREAKER PATTERN
// ============================================================================

/**
 * Check if circuit breaker is open (blocking requests)
 * @returns {boolean}
 */
function isCircuitBreakerOpen() {
  const breaker = getPreference(CIRCUIT_BREAKER_KEY, { failures: 0, lastFailure: null, isOpen: false });

  if (!breaker.isOpen) {
    return false;
  }

  // Check if reset time has passed
  if (breaker.lastFailure) {
    const timeSinceFailure = Date.now() - new Date(breaker.lastFailure).getTime();
    if (timeSinceFailure > CIRCUIT_BREAKER_RESET_TIME) {
      // Half-open: allow one request through
      resetCircuitBreaker();
      return false;
    }
  }

  return true;
}

/**
 * Update circuit breaker state
 * @param {boolean} isFailure - Whether this is a failure
 */
function updateCircuitBreaker(isFailure) {
  const breaker = getPreference(CIRCUIT_BREAKER_KEY, { failures: 0, lastFailure: null, isOpen: false });

  if (isFailure) {
    breaker.failures++;
    breaker.lastFailure = new Date().toISOString();

    if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      breaker.isOpen = true;
      Logger.log('Circuit breaker OPENED after ' + breaker.failures + ' failures');
    }
  } else {
    // Success - reset failures
    breaker.failures = 0;
    breaker.isOpen = false;
  }

  setPreference(CIRCUIT_BREAKER_KEY, breaker);
}

/**
 * Reset circuit breaker
 */
function resetCircuitBreaker() {
  setPreference(CIRCUIT_BREAKER_KEY, { failures: 0, lastFailure: null, isOpen: false });
  Logger.log('Circuit breaker RESET');
}

/**
 * Get circuit breaker status
 * @returns {Object}
 */
function getCircuitBreakerStatus() {
  return getPreference(CIRCUIT_BREAKER_KEY, { failures: 0, lastFailure: null, isOpen: false });
}

// ============================================================================
// USER-FRIENDLY ERROR CARDS
// ============================================================================

/**
 * Build an error card for display
 * @param {Error} error - The error
 * @param {string} context - What was being attempted
 * @returns {Card}
 */
function buildErrorCard(error, context) {
  const parsed = parseError(error);

  const builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Something Went Wrong')
      .setSubtitle(context || 'Operation failed'));

  // Error message section
  const errorSection = CardService.newCardSection()
    .addWidget(CardService.newDecoratedText()
      .setText(parsed.message)
      .setWrapText(true)
      .setStartIcon(CardService.newIconImage()
        .setIcon(CardService.Icon.DESCRIPTION)));

  builder.addSection(errorSection);

  // Add recovery suggestions based on error type
  const recoverySection = CardService.newCardSection()
    .setHeader('What to do');

  switch (parsed.type) {
    case ErrorType.AUTH_ERROR:
      recoverySection.addWidget(CardService.newTextParagraph()
        .setText('1. Open Script Properties in Apps Script editor\n2. Add or update CLAUDE_API_KEY\n3. Get your key from console.anthropic.com'));
      recoverySection.addWidget(CardService.newTextButton()
        .setText('Open Settings')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('showSettings')));
      break;

    case ErrorType.RATE_LIMIT:
      recoverySection.addWidget(CardService.newTextParagraph()
        .setText('You\'ve made too many requests. Please wait a moment before trying again.'));
      recoverySection.addWidget(CardService.newTextButton()
        .setText('Try Again')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('refreshCard')));
      break;

    case ErrorType.NETWORK_ERROR:
      recoverySection.addWidget(CardService.newTextParagraph()
        .setText('Check your internet connection and try again.'));
      recoverySection.addWidget(CardService.newTextButton()
        .setText('Retry')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('refreshCard')));
      break;

    case ErrorType.GMAIL_ERROR:
      recoverySection.addWidget(CardService.newTextParagraph()
        .setText('The email may have been moved or deleted. Try opening a different email.'));
      break;

    default:
      recoverySection.addWidget(CardService.newTextParagraph()
        .setText('Try again or contact support if the problem persists.'));
      if (parsed.isRetryable) {
        recoverySection.addWidget(CardService.newTextButton()
          .setText('Try Again')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('refreshCard')));
      }
  }

  builder.addSection(recoverySection);

  // Debug info (collapsed by default)
  const debugSection = CardService.newCardSection()
    .setCollapsible(true)
    .setHeader('Technical Details')
    .addWidget(CardService.newTextParagraph()
      .setText('Error Type: ' + parsed.type + '\nTime: ' + new Date().toISOString()));

  builder.addSection(debugSection);

  return builder.build();
}

/**
 * Build error notification
 * @param {Error} error - The error
 * @returns {ActionResponse}
 */
function buildErrorNotification(error) {
  const parsed = parseError(error);

  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText(parsed.message))
    .build();
}

/**
 * Safe wrapper for operations that shows error card on failure
 * @param {Function} operation - The operation to perform
 * @param {string} context - What is being attempted
 * @returns {Card|ActionResponse}
 */
function safeOperation(operation, context) {
  try {
    // Check circuit breaker first
    if (isCircuitBreakerOpen()) {
      return buildErrorCard(
        new Error('Service temporarily unavailable. Please try again in a few minutes.'),
        context
      );
    }

    const result = operation();

    // Success - update circuit breaker
    updateCircuitBreaker(false);

    return result;

  } catch (error) {
    // Track error
    trackError(context, error);

    // Return error card
    return buildErrorCard(error, context);
  }
}

/**
 * Safe wrapper that returns ActionResponse with notification on error
 * @param {Function} operation - The operation to perform
 * @param {string} context - What is being attempted
 * @param {Function} successBuilder - Function to build success response
 * @returns {ActionResponse}
 */
function safeAction(operation, context, successBuilder) {
  try {
    if (isCircuitBreakerOpen()) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText('Service temporarily unavailable. Please try again in a few minutes.'))
        .build();
    }

    const result = operation();
    updateCircuitBreaker(false);
    return successBuilder(result);

  } catch (error) {
    trackError(context, error);
    return buildErrorNotification(error);
  }
}

// ============================================================================
// GRACEFUL DEGRADATION
// ============================================================================

/**
 * Execute with fallback on failure
 * @param {Function} primaryFn - Primary function to try
 * @param {Function} fallbackFn - Fallback function if primary fails
 * @param {string} context - Context for logging
 * @returns {*} Result from primary or fallback
 */
function withFallback(primaryFn, fallbackFn, context) {
  try {
    return primaryFn();
  } catch (error) {
    Logger.log('Primary failed for ' + context + ', using fallback: ' + error.message);
    return fallbackFn();
  }
}

/**
 * Execute operation with timeout simulation
 * Note: Apps Script doesn't support true timeouts, this is for structure
 * @param {Function} operation - The operation
 * @param {number} maxTime - Max time in ms (informational)
 * @returns {*} Result
 */
function withTimeout(operation, maxTime) {
  const startTime = Date.now();

  try {
    const result = operation();
    const elapsed = Date.now() - startTime;

    if (elapsed > maxTime) {
      Logger.log('Operation took longer than expected: ' + elapsed + 'ms > ' + maxTime + 'ms');
    }

    return result;

  } catch (error) {
    const elapsed = Date.now() - startTime;
    Logger.log('Operation failed after ' + elapsed + 'ms');
    throw error;
  }
}
