/**
 * Google Calendar Integration
 * Create calendar events from detected meeting information
 */

/**
 * Create a calendar event from meeting detection result
 * @param {Object} meetingInfo - Meeting info from detectMeeting()
 * @param {Object} options - Additional options
 * @returns {Object} Created event info
 */
function createCalendarEvent(meetingInfo, options) {
  options = options || {};

  if (!meetingInfo.hasMeeting) {
    throw new Error('No meeting information to create event from');
  }

  try {
    // Parse the first proposed date/time
    const eventTime = parseMeetingDateTime(meetingInfo.proposedDates);

    if (!eventTime) {
      throw new Error('Could not parse meeting date/time. Please create event manually.');
    }

    // Create event title
    const title = meetingInfo.title || 'Meeting';

    // Parse duration (default 1 hour)
    const durationMinutes = parseDuration(meetingInfo.duration) || 60;
    const endTime = new Date(eventTime.getTime() + durationMinutes * 60000);

    // Create the event
    const calendar = CalendarApp.getDefaultCalendar();

    let event;
    if (meetingInfo.location && meetingInfo.location.includes('http')) {
      // Video call - create event with conferencing
      event = calendar.createEvent(title, eventTime, endTime, {
        description: buildEventDescription(meetingInfo),
        location: meetingInfo.location
      });
    } else {
      event = calendar.createEvent(title, eventTime, endTime, {
        description: buildEventDescription(meetingInfo),
        location: meetingInfo.location || ''
      });
    }

    // Add attendees if available
    if (meetingInfo.attendees && meetingInfo.attendees.length > 0) {
      meetingInfo.attendees.forEach(function(attendee) {
        // Extract email if it's in the attendee string
        const emailMatch = attendee.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) {
          try {
            event.addGuest(emailMatch[0]);
          } catch (e) {
            Logger.log('Could not add attendee: ' + attendee);
          }
        }
      });
    }

    // Track analytics
    trackFeatureUsage('calendar_event_created');

    return {
      success: true,
      eventId: event.getId(),
      title: title,
      startTime: eventTime.toISOString(),
      endTime: endTime.toISOString(),
      htmlLink: getCalendarEventLink(event)
    };

  } catch (error) {
    Logger.log('Calendar event creation error: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse meeting date/time from various formats
 * @param {Array} proposedDates - Array of date strings
 * @returns {Date|null} Parsed date or null
 */
function parseMeetingDateTime(proposedDates) {
  if (!proposedDates || proposedDates.length === 0) {
    return null;
  }

  const dateStr = proposedDates[0];

  // Try to parse with Claude for better accuracy
  try {
    const systemPrompt = `Parse the following date/time string and return JSON with:
- year: 4-digit year (use current year if not specified)
- month: 1-12
- day: 1-31
- hour: 0-23 (use 9 for morning, 14 for afternoon if not specified)
- minute: 0-59 (use 0 if not specified)

Current date for reference: ${new Date().toISOString()}

Respond ONLY with valid JSON.`;

    const response = askClaude(`Parse this date/time: "${dateStr}"`, systemPrompt);
    const parsed = parseClaudeJson(response);

    if (parsed.year && parsed.month && parsed.day) {
      return new Date(parsed.year, parsed.month - 1, parsed.day, parsed.hour || 9, parsed.minute || 0);
    }
  } catch (e) {
    Logger.log('Claude date parse failed: ' + e.message);
  }

  // Fallback: try native Date parsing
  const nativeDate = new Date(dateStr);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  // Try common patterns
  const patterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:at\s*)?(\d{1,2}):?(\d{2})?\s*(am|pm)?/i,
    /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\s*(?:at\s*)?(\d{1,2}):?(\d{2})?\s*(am|pm)?/i
  ];

  for (var i = 0; i < patterns.length; i++) {
    const match = dateStr.match(patterns[i]);
    if (match) {
      // Attempt to construct date from match
      try {
        const constructedDate = constructDateFromMatch(match, patterns[i]);
        if (constructedDate) return constructedDate;
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  return null;
}

/**
 * Construct date from regex match
 * @param {Array} match - Regex match array
 * @param {RegExp} pattern - The pattern used
 * @returns {Date|null}
 */
function constructDateFromMatch(match, pattern) {
  const now = new Date();

  // This is a simplified version - production would need more robust parsing
  if (match[1] && match[2]) {
    let year = parseInt(match[3]) || now.getFullYear();
    let month, day;

    // Check if first group is month name or number
    if (isNaN(parseInt(match[1]))) {
      // Month name
      const months = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
      month = months.indexOf(match[1].toLowerCase());
      day = parseInt(match[2]);
    } else {
      // MM/DD format
      month = parseInt(match[1]) - 1;
      day = parseInt(match[2]);
    }

    let hour = parseInt(match[4]) || 9;
    const minute = parseInt(match[5]) || 0;
    const ampm = match[6];

    if (ampm) {
      if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
      if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
    }

    return new Date(year, month, day, hour, minute);
  }

  return null;
}

/**
 * Parse duration string to minutes
 * @param {string} durationStr - Duration string like "1 hour", "30 minutes"
 * @returns {number} Duration in minutes
 */
function parseDuration(durationStr) {
  if (!durationStr) return 60;

  const hourMatch = durationStr.match(/(\d+)\s*h/i);
  const minMatch = durationStr.match(/(\d+)\s*m/i);

  let minutes = 0;
  if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
  if (minMatch) minutes += parseInt(minMatch[1]);

  return minutes || 60;
}

/**
 * Build event description from meeting info
 * @param {Object} meetingInfo - Meeting detection result
 * @returns {string} Formatted description
 */
function buildEventDescription(meetingInfo) {
  let description = '';

  if (meetingInfo.meetingType) {
    description += 'Type: ' + meetingInfo.meetingType.replace('_', ' ') + '\n';
  }

  if (meetingInfo.agenda) {
    description += '\nAgenda:\n' + meetingInfo.agenda + '\n';
  }

  if (meetingInfo.attendees && meetingInfo.attendees.length > 0) {
    description += '\nAttendees:\n';
    meetingInfo.attendees.forEach(function(a) {
      description += '- ' + a + '\n';
    });
  }

  description += '\n---\nCreated by Claude for Gmail';

  return description;
}

/**
 * Get calendar event link
 * @param {CalendarEvent} event - The calendar event
 * @returns {string} Link to the event
 */
function getCalendarEventLink(event) {
  const eventId = event.getId().split('@')[0];
  return 'https://calendar.google.com/calendar/event?eid=' + Utilities.base64Encode(eventId);
}

/**
 * Get upcoming events for context
 * @param {number} days - Number of days to look ahead
 * @returns {Array} Array of upcoming events
 */
function getUpcomingEvents(days) {
  days = days || 7;
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const events = calendar.getEvents(now, endDate);

  return events.map(function(event) {
    return {
      title: event.getTitle(),
      startTime: event.getStartTime().toISOString(),
      endTime: event.getEndTime().toISOString(),
      location: event.getLocation(),
      description: event.getDescription()
    };
  });
}

/**
 * Check for scheduling conflicts
 * @param {Date} startTime - Proposed start time
 * @param {Date} endTime - Proposed end time
 * @returns {Array} Array of conflicting events
 */
function checkConflicts(startTime, endTime) {
  const calendar = CalendarApp.getDefaultCalendar();
  const events = calendar.getEvents(startTime, endTime);

  return events.map(function(event) {
    return {
      title: event.getTitle(),
      startTime: event.getStartTime().toISOString(),
      endTime: event.getEndTime().toISOString()
    };
  });
}

/**
 * Suggest available times for a meeting
 * @param {number} durationMinutes - Meeting duration in minutes
 * @param {number} daysAhead - Days to look ahead
 * @returns {Array} Array of available time slots
 */
function suggestAvailableTimes(durationMinutes, daysAhead) {
  durationMinutes = durationMinutes || 60;
  daysAhead = daysAhead || 5;

  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const availableSlots = [];

  // Look at business hours (9 AM - 5 PM) for next X days
  for (var d = 1; d <= daysAhead; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);

    // Skip weekends
    if (day.getDay() === 0 || day.getDay() === 6) continue;

    // Check hourly slots from 9 AM to 5 PM
    for (var hour = 9; hour <= 17 - Math.ceil(durationMinutes / 60); hour++) {
      const slotStart = new Date(day);
      slotStart.setHours(hour, 0, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      const events = calendar.getEvents(slotStart, slotEnd);

      if (events.length === 0) {
        availableSlots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          formatted: formatTimeSlot(slotStart, slotEnd)
        });

        // Limit to 10 suggestions
        if (availableSlots.length >= 10) return availableSlots;
      }
    }
  }

  return availableSlots;
}

/**
 * Format time slot for display
 * @param {Date} start - Start time
 * @param {Date} end - End time
 * @returns {string} Formatted string
 */
function formatTimeSlot(start, end) {
  const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  return start.toLocaleDateString('en-US', options) + ' - ' + end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
