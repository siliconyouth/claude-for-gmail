/**
 * Attachment Analysis
 * AI-powered summaries of PDF and document attachments
 */

/**
 * Analyze attachments in an email
 * @param {GmailMessage} message - The Gmail message
 * @returns {Object} Analysis results
 */
function analyzeAttachments(message) {
  const messageId = message.getId();

  // Check cache
  const cacheKey = getAnalysisCacheKey(messageId, 'attachments');
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const attachments = message.getAttachments();

  if (attachments.length === 0) {
    return {
      hasAttachments: false,
      count: 0,
      analyses: []
    };
  }

  const analyses = [];
  const supportedTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/json'];

  attachments.forEach(function(attachment, index) {
    const contentType = attachment.getContentType();
    const name = attachment.getName();
    const size = attachment.getSize();

    const analysis = {
      name: name,
      type: contentType,
      size: formatFileSize(size),
      index: index
    };

    // Only analyze supported types and reasonable sizes
    if (supportedTypes.indexOf(contentType) !== -1 && size < 500000) {
      try {
        analysis.summary = analyzeAttachmentContent(attachment);
        analysis.analyzed = true;
      } catch (e) {
        analysis.summary = 'Could not analyze: ' + e.message;
        analysis.analyzed = false;
      }
    } else if (size >= 500000) {
      analysis.summary = 'File too large to analyze (max 500KB)';
      analysis.analyzed = false;
    } else {
      analysis.summary = 'Unsupported file type for analysis';
      analysis.analyzed = false;
    }

    analyses.push(analysis);
  });

  const result = {
    hasAttachments: true,
    count: attachments.length,
    analyzedCount: analyses.filter(function(a) { return a.analyzed; }).length,
    analyses: analyses
  };

  // Cache for 6 hours
  setCached(cacheKey, result);

  // Track analytics
  trackFeatureUsage('attachment_analysis');

  return result;
}

/**
 * Analyze content of a single attachment
 * @param {GmailAttachment} attachment - The attachment
 * @returns {string} Summary
 */
function analyzeAttachmentContent(attachment) {
  const contentType = attachment.getContentType();
  let text = '';

  if (contentType === 'application/pdf') {
    text = extractTextFromPdf(attachment);
  } else {
    text = attachment.getDataAsString();
  }

  // Limit text length
  const maxLength = 10000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...[truncated]';
  }

  if (text.length < 50) {
    return 'Document is empty or contains only images';
  }

  // Use Claude to summarize
  const systemPrompt = `You are a document analyst. Summarize the key points of this document in 2-4 bullet points.
Focus on: main topic, key data/facts, any action items or important dates.
Be concise and factual.`;

  const prompt = `Summarize this document:\n\n${text}`;

  return askClaude(prompt, systemPrompt);
}

/**
 * Extract text from PDF attachment
 * @param {GmailAttachment} attachment - PDF attachment
 * @returns {string} Extracted text
 */
function extractTextFromPdf(attachment) {
  try {
    // Google Apps Script doesn't have native PDF parsing
    // We'll use the Drive API to extract text via OCR

    const blob = attachment.copyBlob();
    blob.setName(attachment.getName());

    // Create a temporary file in Drive
    const file = DriveApp.createFile(blob);

    // Use Drive's export to Google Doc (which extracts text)
    const docFile = Drive.Files.copy(
      { title: 'temp_' + new Date().getTime(), mimeType: 'application/vnd.google-apps.document' },
      file.getId(),
      { ocr: true }
    );

    // Get the text from the Google Doc
    const doc = DocumentApp.openById(docFile.id);
    const text = doc.getBody().getText();

    // Clean up temp files
    DriveApp.getFileById(file.getId()).setTrashed(true);
    DriveApp.getFileById(docFile.id).setTrashed(true);

    return text;

  } catch (e) {
    Logger.log('PDF extraction error: ' + e.message);

    // Fallback: try to get raw text (won't work well for most PDFs)
    try {
      return attachment.getDataAsString();
    } catch (e2) {
      return 'Could not extract text from PDF';
    }
  }
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Get attachment summary for quick display
 * @param {GmailMessage} message - The Gmail message
 * @returns {Object} Quick summary
 */
function getAttachmentSummary(message) {
  const attachments = message.getAttachments();

  if (attachments.length === 0) {
    return { hasAttachments: false };
  }

  return {
    hasAttachments: true,
    count: attachments.length,
    names: attachments.map(function(a) { return a.getName(); }),
    totalSize: formatFileSize(attachments.reduce(function(sum, a) { return sum + a.getSize(); }, 0))
  };
}

/**
 * Check if any attachments can be analyzed
 * @param {GmailMessage} message - The Gmail message
 * @returns {boolean}
 */
function hasAnalyzableAttachments(message) {
  const attachments = message.getAttachments();
  const supportedTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/json'];

  return attachments.some(function(a) {
    return supportedTypes.indexOf(a.getContentType()) !== -1 && a.getSize() < 500000;
  });
}
