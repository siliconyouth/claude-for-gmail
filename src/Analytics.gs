/**
 * Usage Analytics
 * Track feature usage and provide insights
 */

// Analytics preference keys
const PREF_ANALYTICS_DATA = 'analytics_data';
const PREF_ANALYTICS_ENABLED = 'analytics_enabled';

/**
 * Track feature usage
 * @param {string} feature - Feature name
 * @param {Object} metadata - Optional metadata
 */
function trackFeatureUsage(feature, metadata) {
  try {
    // Check if analytics is enabled
    if (!getPreference(PREF_ANALYTICS_ENABLED, true)) {
      return;
    }

    const analytics = getPreference(PREF_ANALYTICS_DATA, getDefaultAnalytics());
    const today = new Date().toISOString().split('T')[0];

    // Initialize feature tracking if needed
    if (!analytics.features[feature]) {
      analytics.features[feature] = {
        totalCount: 0,
        firstUsed: today,
        lastUsed: today,
        dailyUsage: {}
      };
    }

    const featureData = analytics.features[feature];

    // Update counts
    featureData.totalCount++;
    featureData.lastUsed = today;

    // Track daily usage
    if (!featureData.dailyUsage[today]) {
      featureData.dailyUsage[today] = 0;
    }
    featureData.dailyUsage[today]++;

    // Clean up old daily data (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

    Object.keys(featureData.dailyUsage).forEach(function(date) {
      if (date < cutoffDate) {
        delete featureData.dailyUsage[date];
      }
    });

    // Update global stats
    analytics.totalActions++;
    analytics.lastActivity = new Date().toISOString();

    // Track session
    trackSession(analytics);

    // Save analytics
    setPreference(PREF_ANALYTICS_DATA, analytics);

  } catch (e) {
    // Silently fail - don't break user experience for analytics
    Logger.log('Analytics error: ' + e.message);
  }
}

/**
 * Track user session
 * @param {Object} analytics - Analytics data object
 */
function trackSession(analytics) {
  const now = new Date();
  const lastActivity = analytics.lastActivity ? new Date(analytics.lastActivity) : null;

  // New session if more than 30 minutes since last activity
  if (!lastActivity || (now - lastActivity) > 30 * 60 * 1000) {
    analytics.totalSessions = (analytics.totalSessions || 0) + 1;
    analytics.sessionStart = now.toISOString();
  }
}

/**
 * Get default analytics structure
 * @returns {Object} Default analytics object
 */
function getDefaultAnalytics() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    lastActivity: null,
    totalActions: 0,
    totalSessions: 0,
    features: {},
    apiCalls: {
      claude: { total: 0, tokensUsed: 0 },
      translate: { total: 0 }
    }
  };
}

/**
 * Track API call
 * @param {string} apiType - API type (claude, translate)
 * @param {Object} details - Call details
 */
function trackApiCall(apiType, details) {
  try {
    if (!getPreference(PREF_ANALYTICS_ENABLED, true)) {
      return;
    }

    const analytics = getPreference(PREF_ANALYTICS_DATA, getDefaultAnalytics());

    if (!analytics.apiCalls[apiType]) {
      analytics.apiCalls[apiType] = { total: 0 };
    }

    analytics.apiCalls[apiType].total++;

    if (details && details.tokensUsed) {
      analytics.apiCalls[apiType].tokensUsed =
        (analytics.apiCalls[apiType].tokensUsed || 0) + details.tokensUsed;
    }

    setPreference(PREF_ANALYTICS_DATA, analytics);

  } catch (e) {
    Logger.log('API tracking error: ' + e.message);
  }
}

/**
 * Get usage statistics
 * @returns {Object} Usage stats
 */
function getUsageStats() {
  const analytics = getPreference(PREF_ANALYTICS_DATA, getDefaultAnalytics());

  // Calculate feature ranking
  const featureRanking = Object.keys(analytics.features)
    .map(function(feature) {
      return {
        name: feature,
        count: analytics.features[feature].totalCount,
        lastUsed: analytics.features[feature].lastUsed
      };
    })
    .sort(function(a, b) { return b.count - a.count; });

  // Calculate daily average
  const today = new Date();
  const startDate = analytics.createdAt ? new Date(analytics.createdAt) : today;
  const daysSinceStart = Math.max(1, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)));
  const dailyAverage = analytics.totalActions / daysSinceStart;

  // Get this week's usage
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  let weeklyActions = 0;
  Object.keys(analytics.features).forEach(function(feature) {
    const dailyUsage = analytics.features[feature].dailyUsage || {};
    Object.keys(dailyUsage).forEach(function(date) {
      if (date >= weekStartStr) {
        weeklyActions += dailyUsage[date];
      }
    });
  });

  return {
    totalActions: analytics.totalActions,
    totalSessions: analytics.totalSessions,
    daysSinceStart: daysSinceStart,
    dailyAverage: Math.round(dailyAverage * 10) / 10,
    weeklyActions: weeklyActions,
    topFeatures: featureRanking.slice(0, 5),
    apiCalls: analytics.apiCalls,
    lastActivity: analytics.lastActivity
  };
}

/**
 * Get usage insights with AI analysis
 * @returns {Object} AI-generated insights
 */
function getUsageInsights() {
  const stats = getUsageStats();

  if (stats.totalActions < 10) {
    return {
      insights: ['Keep using the add-on to generate personalized insights!'],
      recommendations: ['Try different features to discover what works best for you.']
    };
  }

  try {
    const systemPrompt = `You are a productivity coach. Analyze this usage data and provide:
1. 2-3 brief insights about the user's email habits
2. 2-3 personalized recommendations to be more productive

Keep responses concise (1-2 sentences each).
Return JSON with: insights (array), recommendations (array)
Respond ONLY with valid JSON.`;

    const prompt = `Analyze this email add-on usage:
- Total actions: ${stats.totalActions}
- Sessions: ${stats.totalSessions}
- Days active: ${stats.daysSinceStart}
- Daily average: ${stats.dailyAverage} actions
- Weekly actions: ${stats.weeklyActions}
- Top features: ${stats.topFeatures.map(function(f) { return f.name + ' (' + f.count + ')'; }).join(', ')}
- API calls - Claude: ${stats.apiCalls.claude?.total || 0}, Translate: ${stats.apiCalls.translate?.total || 0}`;

    const response = askClaude(prompt, systemPrompt);
    return parseClaudeJson(response);

  } catch (error) {
    return {
      insights: [
        'You\'ve used the add-on ' + stats.totalActions + ' times!',
        stats.topFeatures.length > 0 ?
          'Your most-used feature is ' + stats.topFeatures[0].name :
          'Try exploring different features.'
      ],
      recommendations: [
        'Try the Smart Compose feature to write emails faster.',
        'Use Priority Inbox to focus on important emails first.'
      ]
    };
  }
}

/**
 * Reset analytics data
 */
function resetAnalytics() {
  setPreference(PREF_ANALYTICS_DATA, getDefaultAnalytics());
  Logger.log('Analytics data reset');
}

/**
 * Export analytics data
 * @returns {string} JSON string of analytics
 */
function exportAnalytics() {
  const analytics = getPreference(PREF_ANALYTICS_DATA, getDefaultAnalytics());
  return JSON.stringify(analytics, null, 2);
}

/**
 * Toggle analytics collection
 * @param {boolean} enabled - Whether to enable analytics
 */
function setAnalyticsEnabled(enabled) {
  setPreference(PREF_ANALYTICS_ENABLED, enabled);
}

/**
 * Check if analytics is enabled
 * @returns {boolean}
 */
function isAnalyticsEnabled() {
  return getPreference(PREF_ANALYTICS_ENABLED, true);
}

/**
 * Get feature usage trend (last 7 days)
 * @param {string} feature - Feature name
 * @returns {Array} Daily counts for last 7 days
 */
function getFeatureTrend(feature) {
  const analytics = getPreference(PREF_ANALYTICS_DATA, getDefaultAnalytics());
  const featureData = analytics.features[feature];

  if (!featureData) {
    return [];
  }

  const trend = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    trend.push({
      date: dateStr,
      count: featureData.dailyUsage[dateStr] || 0
    });
  }

  return trend;
}

