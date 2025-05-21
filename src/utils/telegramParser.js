/**
 * Telegram message parser utilities
 * 
 * These functions help parse user replies from Telegram,
 * particularly answers to numbered questions.
 */

/**
 * Parse a Telegram message containing numbered answers
 * Accepts formats like:
 * - 1. Yes
 * - 2. $1300 + GST
 * - 3: Friday afternoon
 * - 1 - Yes
 * - 1)Yes
 * 
 * @param {string} messageText - The message text to parse
 * @returns {Object} - An object with question numbers as keys and answers as values
 */
export const parseNumberedAnswers = (messageText) => {
  if (!messageText || typeof messageText !== 'string') {
    return {};
  }

  const answers = {};
  const lines = messageText.split('\n');

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Match different numbering formats
    // This regex captures:
    // - A number at the start of the line
    // - Optional separator (., :, -, ), etc.)
    // - The rest of the line as the answer
    const match = line.trim().match(/^(\d+)(?:[.:\-\)\s]+)?\s*(.+)$/);

    if (match) {
      const questionNumber = parseInt(match[1], 10);
      const answer = match[2].trim();
      
      if (!isNaN(questionNumber) && answer) {
        answers[questionNumber] = answer;
      }
    }
  }

  return answers;
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
 * Match numbered answers to original questions
 * @param {Array<string>} questions - The original questions array
 * @param {Object} answers - The numbered answers object (keys are numbers, values are answer strings)
 * @returns {Object} - A new object with questions as keys and answers as values
 */
export const matchAnswersToQuestions = (questions, answers) => {
  if (!Array.isArray(questions) || !questions.length || !answers || typeof answers !== 'object') {
    return {};
  }

  const matchedResult = {};
  
  // Iterate through questions and match with corresponding answers
  questions.forEach((question, index) => {
    // Questions array is 0-indexed, but answer numbers are 1-indexed
    const answerNumber = index + 1;
    
    if (answers[answerNumber]) {
      matchedResult[question] = answers[answerNumber];
    }
  });
  
  return matchedResult;
};

export default {
  parseNumberedAnswers,
  formatNumberedQuestions,
  convertQFormatToNumbered,
  matchAnswersToQuestions
}; 