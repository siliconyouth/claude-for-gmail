/**
 * Offline Caching
 * Enhanced caching for offline-first experience
 */

// Cache configuration
const OFFLINE_CACHE_PREFIX = 'offline_';
const CACHE_METADATA_KEY = 'cache_metadata';
const MAX_CACHE_SIZE_BYTES = 100 * 1024; // 100KB per item (CacheService limit)
const MAX_TOTAL_CACHE_ITEMS = 50;

// Cache TTL settings (in seconds)
const CACHE_TTL = {
  SUMMARY: 6 * 60 * 60,        // 6 hours
  ANALYSIS: 6 * 60 * 60,       // 6 hours
  REPLY_DRAFT: 30 * 60,        // 30 minutes
  TRANSLATION: 24 * 60 * 60,   // 24 hours
  CONTACT_INSIGHTS: 12 * 60 * 60, // 12 hours
  PRIORITY_INBOX: 30 * 60,     // 30 minutes
  TEMPLATES: 24 * 60 * 60,     // 24 hours
  SETTINGS: 60 * 60            // 1 hour
};

/**
 * Get cache metadata (tracks what's cached)
 * @returns {Object} Cache metadata
 */
function getCacheMetadata() {
  try {
    const props = PropertiesService.getUserProperties();
    const metadata = props.getProperty(CACHE_METADATA_KEY);
    return metadata ? JSON.parse(metadata) : { items: {}, totalSize: 0 };
  } catch (e) {
    return { items: {}, totalSize: 0 };
  }
}

/**
 * Update cache metadata
 * @param {Object} metadata - Updated metadata
 */
function setCacheMetadata(metadata) {
  try {
    const props = PropertiesService.getUserProperties();
    props.setProperty(CACHE_METADATA_KEY, JSON.stringify(metadata));
  } catch (e) {
    Logger.log('Failed to save cache metadata: ' + e.message);
  }
}

/**
 * Enhanced cache get with stale-while-revalidate support
 * @param {string} key - Cache key
 * @param {Object} options - Options (allowStale, revalidateFn)
 * @returns {Object} Cached value with metadata
 */
function getOfflineCached(key, options) {
  options = options || {};

  try {
    const cache = CacheService.getUserCache();
    const fullKey = OFFLINE_CACHE_PREFIX + key;
    const cached = cache.get(fullKey);

    if (!cached) {
      return { value: null, isStale: false, fromCache: false };
    }

    const parsed = JSON.parse(cached);

    // Check if data is stale
    const now = Date.now();
    const isStale = parsed.expiresAt && now > parsed.expiresAt;

    // If stale and revalidate function provided, trigger background refresh
    if (isStale && options.revalidateFn && options.allowStale) {
      // Queue revalidation (will run on next trigger)
      queueRevalidation(key, options.revalidateFn.name);
    }

    return {
      value: parsed.data,
      isStale: isStale,
      fromCache: true,
      cachedAt: parsed.cachedAt,
      expiresAt: parsed.expiresAt
    };

  } catch (e) {
    Logger.log('Offline cache get error: ' + e.message);
    return { value: null, isStale: false, fromCache: false };
  }
}

/**
 * Enhanced cache set with metadata tracking
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds
 * @param {Object} options - Additional options
 */
function setOfflineCached(key, value, ttlSeconds, options) {
  options = options || {};

  try {
    const cache = CacheService.getUserCache();
    const fullKey = OFFLINE_CACHE_PREFIX + key;
    const now = Date.now();

    const cacheEntry = {
      data: value,
      cachedAt: now,
      expiresAt: now + (ttlSeconds * 1000),
      type: options.type || 'generic'
    };

    const serialized = JSON.stringify(cacheEntry);

    // Check size limit
    if (serialized.length > MAX_CACHE_SIZE_BYTES) {
      Logger.log('Cache item too large: ' + key + ' (' + serialized.length + ' bytes)');
      return false;
    }

    // Update metadata
    const metadata = getCacheMetadata();

    // Evict old items if needed
    const itemCount = Object.keys(metadata.items).length;
    if (itemCount >= MAX_TOTAL_CACHE_ITEMS) {
      evictOldestCacheItem(metadata);
    }

    metadata.items[key] = {
      size: serialized.length,
      cachedAt: now,
      type: options.type || 'generic'
    };
    metadata.totalSize = Object.values(metadata.items)
      .reduce(function(sum, item) { return sum + item.size; }, 0);

    // Save to cache and update metadata
    cache.put(fullKey, serialized, ttlSeconds);
    setCacheMetadata(metadata);

    return true;

  } catch (e) {
    Logger.log('Offline cache set error: ' + e.message);
    return false;
  }
}

/**
 * Remove item from offline cache
 * @param {string} key - Cache key
 */
function removeOfflineCached(key) {
  try {
    const cache = CacheService.getUserCache();
    cache.remove(OFFLINE_CACHE_PREFIX + key);

    // Update metadata
    const metadata = getCacheMetadata();
    delete metadata.items[key];
    metadata.totalSize = Object.values(metadata.items)
      .reduce(function(sum, item) { return sum + item.size; }, 0);
    setCacheMetadata(metadata);

  } catch (e) {
    Logger.log('Offline cache remove error: ' + e.message);
  }
}

/**
 * Evict oldest cache item
 * @param {Object} metadata - Cache metadata
 */
function evictOldestCacheItem(metadata) {
  let oldestKey = null;
  let oldestTime = Date.now();

  Object.keys(metadata.items).forEach(function(key) {
    if (metadata.items[key].cachedAt < oldestTime) {
      oldestTime = metadata.items[key].cachedAt;
      oldestKey = key;
    }
  });

  if (oldestKey) {
    const cache = CacheService.getUserCache();
    cache.remove(OFFLINE_CACHE_PREFIX + oldestKey);
    delete metadata.items[oldestKey];
    Logger.log('Evicted oldest cache item: ' + oldestKey);
  }
}

/**
 * Queue a revalidation for background processing
 * @param {string} key - Cache key to revalidate
 * @param {string} functionName - Function to call for revalidation
 */
function queueRevalidation(key, functionName) {
  const queue = getPreference('revalidation_queue', []);

  // Avoid duplicates
  const exists = queue.some(function(item) { return item.key === key; });
  if (!exists) {
    queue.push({
      key: key,
      functionName: functionName,
      queuedAt: new Date().toISOString()
    });
    setPreference('revalidation_queue', queue);
  }
}

/**
 * Process revalidation queue (called by scheduler)
 */
function processRevalidationQueue() {
  const queue = getPreference('revalidation_queue', []);

  if (queue.length === 0) return;

  // Process up to 3 items per run
  const toProcess = queue.slice(0, 3);
  const remaining = queue.slice(3);

  toProcess.forEach(function(item) {
    try {
      // Call the revalidation function dynamically
      const fn = globalThis[item.functionName];
      if (typeof fn === 'function') {
        fn(item.key);
        Logger.log('Revalidated: ' + item.key);
      }
    } catch (e) {
      Logger.log('Revalidation failed for ' + item.key + ': ' + e.message);
    }
  });

  setPreference('revalidation_queue', remaining);
}

/**
 * Cache warming - preload frequently used data
 * Called periodically to keep cache fresh
 */
function warmCache() {
  Logger.log('Starting cache warming...');

  try {
    // Warm priority inbox (most important)
    const lastPriorityRefresh = getPreference('last_priority_refresh', 0);
    const now = Date.now();

    if (now - lastPriorityRefresh > CACHE_TTL.PRIORITY_INBOX * 1000) {
      getPriorityInbox(20); // This function caches internally
      setPreference('last_priority_refresh', now);
      Logger.log('Warmed: Priority inbox');
    }

    // Warm templates
    const lastTemplateRefresh = getPreference('last_template_refresh', 0);
    if (now - lastTemplateRefresh > CACHE_TTL.TEMPLATES * 1000) {
      const templates = getTemplates();
      setOfflineCached('templates', templates, CACHE_TTL.TEMPLATES, { type: 'templates' });
      setPreference('last_template_refresh', now);
      Logger.log('Warmed: Templates');
    }

    Logger.log('Cache warming complete');

  } catch (e) {
    Logger.log('Cache warming error: ' + e.message);
  }
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
  const metadata = getCacheMetadata();
  const itemCount = Object.keys(metadata.items).length;

  // Group by type
  const byType = {};
  Object.values(metadata.items).forEach(function(item) {
    const type = item.type || 'generic';
    if (!byType[type]) {
      byType[type] = { count: 0, size: 0 };
    }
    byType[type].count++;
    byType[type].size += item.size;
  });

  return {
    itemCount: itemCount,
    totalSize: metadata.totalSize,
    totalSizeFormatted: formatBytes(metadata.totalSize),
    maxItems: MAX_TOTAL_CACHE_ITEMS,
    utilizationPercent: Math.round((itemCount / MAX_TOTAL_CACHE_ITEMS) * 100),
    byType: byType
  };
}

/**
 * Format bytes for display
 * @param {number} bytes - Bytes to format
 * @returns {string} Formatted string
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Clear all offline cache
 */
function clearOfflineCache() {
  const metadata = getCacheMetadata();
  const cache = CacheService.getUserCache();

  // Remove all cached items
  Object.keys(metadata.items).forEach(function(key) {
    cache.remove(OFFLINE_CACHE_PREFIX + key);
  });

  // Reset metadata
  setCacheMetadata({ items: {}, totalSize: 0 });

  // Clear revalidation queue
  setPreference('revalidation_queue', []);

  Logger.log('Offline cache cleared');
}

/**
 * Get or compute with offline cache
 * @param {string} key - Cache key
 * @param {Function} computeFn - Function to compute value
 * @param {number} ttlSeconds - Cache TTL
 * @param {Object} options - Options
 * @returns {*} Cached or computed value
 */
function getOrComputeOffline(key, computeFn, ttlSeconds, options) {
  options = options || {};

  // Try to get from cache
  const cached = getOfflineCached(key, {
    allowStale: options.allowStale,
    revalidateFn: computeFn
  });

  // Return cached value if fresh or if allowing stale
  if (cached.value !== null && (!cached.isStale || options.allowStale)) {
    return cached.value;
  }

  // Compute fresh value
  try {
    const value = computeFn();
    setOfflineCached(key, value, ttlSeconds, options);
    return value;

  } catch (e) {
    // If computation fails but we have stale data, return it
    if (cached.value !== null) {
      Logger.log('Using stale cache due to error: ' + e.message);
      return cached.value;
    }
    throw e;
  }
}

/**
 * Prefetch data for likely next actions
 * @param {string} messageId - Current message being viewed
 */
function prefetchForMessage(messageId) {
  // Don't prefetch if offline or circuit breaker open
  if (isCircuitBreakerOpen()) return;

  try {
    const message = GmailApp.getMessageById(messageId);
    if (!message) return;

    // Check what's already cached
    const summaryKey = getAnalysisCacheKey(messageId, 'summary');
    const summaryCache = getOfflineCached(summaryKey);

    // If summary not cached, queue it for prefetch
    if (!summaryCache.value) {
      // Use a lighter-weight summary for prefetch
      queueRevalidation(summaryKey, 'prefetchSummary');
    }

    // Prefetch contact insights for sender
    const from = message.getFrom();
    const emailMatch = from.match(/<([^>]+)>/) || [null, from];
    const emailAddress = emailMatch[1] || from;
    const contactKey = 'contact_' + emailAddress;
    const contactCache = getOfflineCached(contactKey);

    if (!contactCache.value) {
      queueRevalidation(contactKey, 'prefetchContactInsights');
    }

  } catch (e) {
    Logger.log('Prefetch error: ' + e.message);
  }
}

/**
 * Prefetch summary for a message
 * @param {string} cacheKey - The cache key (includes message ID)
 */
function prefetchSummary(cacheKey) {
  try {
    const messageId = cacheKey.split('_').pop();
    const message = GmailApp.getMessageById(messageId);

    if (message) {
      const summary = summarizeEmail(message);
      setOfflineCached(cacheKey, summary, CACHE_TTL.SUMMARY, { type: 'summary' });
    }
  } catch (e) {
    Logger.log('Prefetch summary failed: ' + e.message);
  }
}

/**
 * Prefetch contact insights
 * @param {string} cacheKey - The cache key (includes email address)
 */
function prefetchContactInsights(cacheKey) {
  try {
    const emailAddress = cacheKey.replace('contact_', '');
    const insights = getContactInsights(emailAddress);
    setOfflineCached(cacheKey, insights, CACHE_TTL.CONTACT_INSIGHTS, { type: 'contact' });
  } catch (e) {
    Logger.log('Prefetch contact insights failed: ' + e.message);
  }
}

/**
 * Check if cache needs maintenance
 * @returns {boolean} Whether maintenance is needed
 */
function needsCacheMaintenance() {
  const stats = getCacheStats();

  // Maintenance needed if:
  // - Cache is over 80% full
  // - Revalidation queue has items
  // - It's been over 6 hours since last warm

  const queue = getPreference('revalidation_queue', []);
  const lastMaintenance = getPreference('last_cache_maintenance', 0);
  const hoursSinceMaintenance = (Date.now() - lastMaintenance) / (1000 * 60 * 60);

  return stats.utilizationPercent > 80 ||
         queue.length > 0 ||
         hoursSinceMaintenance > 6;
}

/**
 * Run cache maintenance
 */
function runCacheMaintenance() {
  Logger.log('Running cache maintenance...');

  // Process revalidation queue
  processRevalidationQueue();

  // Evict expired items
  evictExpiredItems();

  // Warm frequently used data
  warmCache();

  setPreference('last_cache_maintenance', Date.now());
  Logger.log('Cache maintenance complete');
}

/**
 * Evict expired cache items
 */
function evictExpiredItems() {
  const metadata = getCacheMetadata();
  const cache = CacheService.getUserCache();
  let evicted = 0;

  Object.keys(metadata.items).forEach(function(key) {
    // Try to get the item - if it fails or returns null, it's expired
    const fullKey = OFFLINE_CACHE_PREFIX + key;
    const cached = cache.get(fullKey);

    if (!cached) {
      delete metadata.items[key];
      evicted++;
    }
  });

  if (evicted > 0) {
    metadata.totalSize = Object.values(metadata.items)
      .reduce(function(sum, item) { return sum + item.size; }, 0);
    setCacheMetadata(metadata);
    Logger.log('Evicted ' + evicted + ' expired items');
  }
}

