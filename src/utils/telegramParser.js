/**
 * Telegram message parser utilities
 * 
 * These functions help parse user replies from Telegram,
 * particularly answers to numbered questions.
 */

/**
 * Parse a Telegram message containing any text
 * Now accepts any format - no specific formatting required
 * Works with any language and message structure
 * 
 * @param {string} messageText - The message text to parse
 * @returns {Object} - An object with the full message text
 */
export const parseNumberedAnswers = (messageText) => {
  if (!messageText || typeof messageText !== 'string') {
    return {};
  }

  // Instead of parsing for numbered answers, we now just return the full message
  // This enables support for any language and free-form text
  return {
    1: messageText.trim() // Store the entire message as answer #1
  };
};

/**
 * Format the questions for a Telegram message
 * Creates a numbered list of questions
 * 
 * @param {Array<string>} questions - The questions to format
 * @returns {string} - Formatted questions text
 */
export const formatNumberedQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return '';
  }

  let formattedText = '';
  
  questions.forEach((question, index) => {
    formattedText += `${index + 1}. ${question}\n`;
  });
  
  return formattedText;
};

/**
 * Convert Q1/Q2 format message to numbered format
 * This is for backward compatibility
 * 
 * @param {string} messageText - The Q1/Q2 format message
 * @returns {string} - Converted to 1./2. format
 */
export const convertQFormatToNumbered = (messageText) => {
  if (!messageText || typeof messageText !== 'string') {
    return messageText;
  }
  
  // Replace Q1:, Q2:, etc. with 1., 2., etc.
  return messageText.replace(/Q(\d+)\s*:/gi, '$1.');
};

/**
 * Match answers to original questions
 * Modified to work with any free-form text response
 * 
 * @param {Array<string>} questions - The original questions array
 * @param {Object} answers - The answer object containing the full message
 * @returns {Object} - A new object with questions and the full message response
 */
export const matchAnswersToQuestions = (questions, answers) => {
  if (!Array.isArray(questions) || !questions.length || !answers || typeof answers !== 'object') {
    return {};
  }

  // Get the full message text (stored as answer #1)
  const fullMessage = answers[1];
  
  // Create a result that maps all questions to the same full message
  // This ensures the AI gets the full context when generating a reply
  const result = {
    fullMessage: fullMessage
  };
  
  // We also provide the first question mapped to the answer for backward compatibility
  if (questions[0]) {
    result[questions[0]] = fullMessage;
  }
  
  return result;
};

export default {
  parseNumberedAnswers,
  formatNumberedQuestions,
  convertQFormatToNumbered,
  matchAnswersToQuestions
}; 