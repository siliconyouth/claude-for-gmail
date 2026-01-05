/**
 * Google Translate Integration for Gmail Add-on
 * Uses LanguageApp service (free, no API key required)
 */

// All languages supported by Google Translate
// Source: https://cloud.google.com/translate/docs/languages
const GOOGLE_TRANSLATE_LANGUAGES = {
  'af': 'Afrikaans',
  'sq': 'Albanian',
  'am': 'Amharic',
  'ar': 'Arabic',
  'hy': 'Armenian',
  'az': 'Azerbaijani',
  'eu': 'Basque',
  'be': 'Belarusian',
  'bn': 'Bengali',
  'bs': 'Bosnian',
  'bg': 'Bulgarian',
  'ca': 'Catalan',
  'ceb': 'Cebuano',
  'zh': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'co': 'Corsican',
  'hr': 'Croatian',
  'cs': 'Czech',
  'da': 'Danish',
  'nl': 'Dutch',
  'en': 'English',
  'eo': 'Esperanto',
  'et': 'Estonian',
  'fi': 'Finnish',
  'fr': 'French',
  'fy': 'Frisian',
  'gl': 'Galician',
  'ka': 'Georgian',
  'de': 'German',
  'el': 'Greek',
  'gu': 'Gujarati',
  'ht': 'Haitian Creole',
  'ha': 'Hausa',
  'haw': 'Hawaiian',
  'he': 'Hebrew',
  'hi': 'Hindi',
  'hmn': 'Hmong',
  'hu': 'Hungarian',
  'is': 'Icelandic',
  'ig': 'Igbo',
  'id': 'Indonesian',
  'ga': 'Irish',
  'it': 'Italian',
  'ja': 'Japanese',
  'jv': 'Javanese',
  'kn': 'Kannada',
  'kk': 'Kazakh',
  'km': 'Khmer',
  'rw': 'Kinyarwanda',
  'ko': 'Korean',
  'ku': 'Kurdish',
  'ky': 'Kyrgyz',
  'lo': 'Lao',
  'la': 'Latin',
  'lv': 'Latvian',
  'lt': 'Lithuanian',
  'lb': 'Luxembourgish',
  'mk': 'Macedonian',
  'mg': 'Malagasy',
  'ms': 'Malay',
  'ml': 'Malayalam',
  'mt': 'Maltese',
  'mi': 'Maori',
  'mr': 'Marathi',
  'mn': 'Mongolian',
  'my': 'Myanmar (Burmese)',
  'ne': 'Nepali',
  'no': 'Norwegian',
  'ny': 'Nyanja (Chichewa)',
  'or': 'Odia (Oriya)',
  'ps': 'Pashto',
  'fa': 'Persian',
  'pl': 'Polish',
  'pt': 'Portuguese',
  'pa': 'Punjabi',
  'ro': 'Romanian',
  'ru': 'Russian',
  'sm': 'Samoan',
  'gd': 'Scots Gaelic',
  'sr': 'Serbian',
  'st': 'Sesotho',
  'sn': 'Shona',
  'sd': 'Sindhi',
  'si': 'Sinhala',
  'sk': 'Slovak',
  'sl': 'Slovenian',
  'so': 'Somali',
  'es': 'Spanish',
  'su': 'Sundanese',
  'sw': 'Swahili',
  'sv': 'Swedish',
  'tl': 'Tagalog (Filipino)',
  'tg': 'Tajik',
  'ta': 'Tamil',
  'tt': 'Tatar',
  'te': 'Telugu',
  'th': 'Thai',
  'tr': 'Turkish',
  'tk': 'Turkmen',
  'uk': 'Ukrainian',
  'ur': 'Urdu',
  'ug': 'Uyghur',
  'uz': 'Uzbek',
  'vi': 'Vietnamese',
  'cy': 'Welsh',
  'xh': 'Xhosa',
  'yi': 'Yiddish',
  'yo': 'Yoruba',
  'zu': 'Zulu'
};

// Common languages for quick access (shown first in UI)
const COMMON_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'ru', 'hi',
  'nl', 'pl', 'tr', 'vi', 'th', 'id', 'uk', 'cs', 'sv', 'da', 'fi', 'no'
];

/**
 * Get all available languages
 * @returns {Object} Map of language code to language name
 */
function getAvailableLanguages() {
  return GOOGLE_TRANSLATE_LANGUAGES;
}

/**
 * Get common languages for quick access
 * @returns {Array} Array of {code, name} objects
 */
function getCommonLanguages() {
  return COMMON_LANGUAGES.map(function(code) {
    return {
      code: code,
      name: GOOGLE_TRANSLATE_LANGUAGES[code]
    };
  });
}

/**
 * Get all languages as array sorted alphabetically
 * @returns {Array} Array of {code, name} objects sorted by name
 */
function getAllLanguagesSorted() {
  const languages = [];
  for (var code in GOOGLE_TRANSLATE_LANGUAGES) {
    languages.push({
      code: code,
      name: GOOGLE_TRANSLATE_LANGUAGES[code]
    });
  }
  languages.sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });
  return languages;
}

/**
 * Get language name by code
 * @param {string} code - Language code
 * @returns {string} Language name
 */
function getLanguageName(code) {
  return GOOGLE_TRANSLATE_LANGUAGES[code] || code;
}

/**
 * Detect language using Google Translate
 * @param {string} text - Text to detect language of
 * @returns {Object} Detection result with code, name, and confidence
 */
function detectLanguageGoogle(text) {
  try {
    // Use a sample of the text for detection (faster)
    const sample = text.substring(0, 1000);

    // Google's LanguageApp doesn't have a direct detect method,
    // but we can translate with auto-detect and infer the source
    // However, there's no direct API for detection in LanguageApp

    // Workaround: Try translating to English and check if text changes significantly
    // If it doesn't change much, it's likely already English

    // Better approach: Use Google Translate API pattern matching
    // by translating from '' (auto) to 'en' and comparing

    const translatedToEnglish = LanguageApp.translate(sample, '', 'en');

    // If translation is nearly identical, source is likely English
    const similarity = calculateSimilarity(sample, translatedToEnglish);

    if (similarity > 0.9) {
      return {
        language: 'en',
        languageName: 'English',
        confidence: 'high',
        detectedBy: 'Google Translate'
      };
    }

    // Try common languages to find best match
    const testLanguages = ['es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'ru', 'hi'];

    for (var i = 0; i < testLanguages.length; i++) {
      var langCode = testLanguages[i];
      try {
        const backTranslated = LanguageApp.translate(sample, langCode, 'en');
        const backSimilarity = calculateSimilarity(translatedToEnglish, backTranslated);
        if (backSimilarity > 0.8) {
          return {
            language: langCode,
            languageName: GOOGLE_TRANSLATE_LANGUAGES[langCode],
            confidence: 'medium',
            detectedBy: 'Google Translate'
          };
        }
      } catch (e) {
        // Skip this language if translation fails
      }
    }

    // Default to unknown with auto-translate capability
    return {
      language: 'auto',
      languageName: 'Auto-detect',
      confidence: 'low',
      detectedBy: 'Google Translate',
      note: 'Use auto-detect for translation'
    };

  } catch (error) {
    Logger.log('Language detection error: ' + error.message);
    return {
      language: 'auto',
      languageName: 'Auto-detect',
      confidence: 'low',
      detectedBy: 'Error',
      error: error.message
    };
  }
}

/**
 * Calculate text similarity (Jaccard similarity on words)
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity score 0-1
 */
function calculateSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);

  const set1 = {};
  const set2 = {};

  words1.forEach(function(w) { set1[w] = true; });
  words2.forEach(function(w) { set2[w] = true; });

  var intersection = 0;
  var union = 0;

  for (var word in set1) {
    union++;
    if (set2[word]) {
      intersection++;
    }
  }

  for (var word in set2) {
    if (!set1[word]) {
      union++;
    }
  }

  return union > 0 ? intersection / union : 0;
}

/**
 * Translate text using Google Translate (free)
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language code (optional, '' for auto-detect)
 * @returns {Object} Translation result
 */
function translateWithGoogle(text, targetLanguage, sourceLanguage) {
  try {
    const source = sourceLanguage || '';
    const startTime = new Date().getTime();

    const translatedText = LanguageApp.translate(text, source, targetLanguage);

    const endTime = new Date().getTime();
    const duration = endTime - startTime;

    return {
      success: true,
      translatedText: translatedText,
      sourceLanguage: source || 'auto',
      targetLanguage: targetLanguage,
      targetLanguageName: GOOGLE_TRANSLATE_LANGUAGES[targetLanguage] || targetLanguage,
      characterCount: text.length,
      translationTime: duration + 'ms',
      service: 'Google Translate (free)'
    };

  } catch (error) {
    Logger.log('Translation error: ' + error.message);
    return {
      success: false,
      error: error.message,
      translatedText: text,
      sourceLanguage: sourceLanguage || 'unknown',
      targetLanguage: targetLanguage,
      service: 'Google Translate (free)'
    };
  }
}

/**
 * Batch translate multiple texts
 * @param {Array<string>} texts - Array of texts to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language code (optional)
 * @returns {Array<Object>} Array of translation results
 */
function batchTranslate(texts, targetLanguage, sourceLanguage) {
  return texts.map(function(text) {
    return translateWithGoogle(text, targetLanguage, sourceLanguage);
  });
}

/**
 * Translate email body using Google Translate
 * This replaces the Claude-based translateEmail function
 * @param {string} emailBody - Email content to translate
 * @param {string} targetLanguage - Target language code
 * @returns {Object} Translation result compatible with existing UI
 */
function translateEmailGoogle(emailBody, targetLanguage) {
  const result = translateWithGoogle(emailBody, targetLanguage, '');

  return {
    translatedText: result.translatedText,
    sourceLanguage: result.sourceLanguage,
    targetLanguage: result.targetLanguage,
    targetLanguageName: result.targetLanguageName,
    notes: result.success ? '' : 'Translation error: ' + result.error,
    service: result.service
  };
}

/**
 * Quick translate to English (most common use case)
 * @param {string} text - Text to translate
 * @returns {string} Translated text in English
 */
function translateToEnglish(text) {
  return LanguageApp.translate(text, '', 'en');
}

/**
 * Check if a language code is valid
 * @param {string} code - Language code to check
 * @returns {boolean} True if valid
 */
function isValidLanguageCode(code) {
  return GOOGLE_TRANSLATE_LANGUAGES.hasOwnProperty(code);
}

/**
 * Get language families for organized display
 * @returns {Object} Languages grouped by family/region
 */
function getLanguageFamilies() {
  return {
    'European': ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'uk', 'cs', 'sv', 'da', 'fi', 'no', 'el', 'ro', 'hu', 'bg', 'sk', 'sl', 'hr', 'sr', 'lt', 'lv', 'et'],
    'Asian': ['zh', 'zh-TW', 'ja', 'ko', 'vi', 'th', 'id', 'ms', 'tl', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur', 'ne', 'my', 'km', 'lo'],
    'Middle Eastern': ['ar', 'he', 'fa', 'tr', 'ku', 'ps'],
    'African': ['sw', 'am', 'ha', 'ig', 'yo', 'zu', 'xh', 'sn', 'st', 'ny', 'mg', 'so', 'rw'],
    'Other': ['eo', 'la', 'haw', 'mi', 'sm', 'ht', 'co', 'cy', 'ga', 'gd', 'eu', 'gl', 'ca', 'mt', 'lb', 'fy', 'is']
  };
}
