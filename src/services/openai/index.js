// OpenAI service for interacting with OpenAI API
import { config } from '../../config/env.js';

/**
 * Classify an email into categories
 * @param {Object} email - The email to classify
 * @param {string} email.subject - Email subject
 * @param {string} email.body - Email body content
 * @param {string} email.sender - Email sender
 * @returns {Promise<Object>} - Classification results
 */
export const classifyEmail = async ({ subject, body, sender }) => {
  try {
    // This is a placeholder for the actual OpenAI API implementation
    console.log('OpenAI Service - Classifying email:');
    console.log(`From: ${sender}`);
    console.log(`Subject: ${subject}`);
    
    // Mock classification response - in real implementation, this would use OpenAI API
    const categories = ['urgent', 'work', 'personal', 'spam'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    return {
      category: randomCategory,
      confidence: 0.85,
      analysis: 'This is a placeholder email classification',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in OpenAI service:', error);
    throw new Error('Failed to classify email: ' + error.message);
  }
};

/**
 * Classify email text to determine if it can be auto-processed or needs human input
 * @param {string} text - The email text content to analyze
 * @returns {Promise<Object>} - Classification and extracted questions
 */
export const classifyEmailText = async (text) => {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input: text must be a non-empty string');
    }

    // In a real implementation, this would call the OpenAI API
    // For now, we'll use some simple heuristics and mock the response
    
    // Check if the email contains questions
    const questionRegex = /\b(?:who|what|when|where|why|how|can you|could you|would you|will you|is there|are there|do you|did you|have you|has|should|shall|may I|are we|is it)\b.*\?/gi;
    const questions = text.match(questionRegex) || [];
    
    // Simple heuristic rules for classification (in real implementation this would use AI)
    const containsComplexQuestions = questions.length > 0;
    const containsRequestForAction = /please|kindly|would you|could you|can you/i.test(text);
    const isSimpleConfirmation = /thank you|thanks|received|got it|confirm|acknowledged/i.test(text) && text.length < 200;
    const isOutOfOffice = /out of office|away from|vacation|holiday|unavailable|will be back/i.test(text);
    
    // Determine classification
    let classification = 'auto';
    let confidence = 0.7;
    
    if (containsComplexQuestions || containsRequestForAction) {
      classification = 'needs_input';
      confidence = containsComplexQuestions ? 0.9 : 0.75;
    } else if (isSimpleConfirmation || isOutOfOffice) {
      classification = 'auto';
      confidence = 0.95;
    }
    
    // In real implementation, the confidence would come from the AI model
    return {
      classification,
      confidence,
      questions: questions.map(q => q.trim()),
      needsHumanReview: classification === 'needs_input',
      analysis: `Email was classified as ${classification} with ${confidence.toFixed(2)} confidence.`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error classifying email text:', error);
    throw new Error('Failed to classify email text: ' + error.message);
  }
};

/**
 * Extract JSON from a string that might contain markdown code blocks
 * @param {string} text - The text that might contain JSON
 * @returns {Object} - Parsed JSON object
 */
const extractJsonFromMarkdown = (text) => {
  try {
    // Check if the response is wrapped in markdown code blocks
    const jsonRegex = /```(?:json)?\s*({[\s\S]*?})\s*```/;
    const match = text.match(jsonRegex);
    
    if (match && match[1]) {
      // If it's in a code block, extract the JSON part
      return JSON.parse(match[1]);
    }
    
    // If not in code blocks, try to parse the whole text as JSON
    return JSON.parse(text);
  } catch (jsonError) {
    // If both approaches fail, clean the text and try again
    try {
      // Remove any non-JSON content that might be in the response
      const cleanedText = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanedText);
    } catch (cleanError) {
      throw new Error(`Could not parse as JSON: ${cleanError.message}`);
    }
  }
};

/**
 * Classify email text for photographer business using OpenAI
 * @param {string} text - The email text content to analyze
 * @returns {Promise<Object>} - Classification and extracted questions
 */
export const classifyEmailForPhotographer = async (text) => {
  try {
    // Debug log to check input
    console.log('Input to classifyEmailForPhotographer:', {
      text: text ? text.substring(0, 100) + '...' : null, // Log first 100 chars
      isString: typeof text === 'string',
      length: text?.length
    });

    if (!text || typeof text !== 'string') {
      console.error('Invalid input to classifyEmailForPhotographer:', { text });
      throw new Error('Invalid input: text must be a non-empty string');
    }

    console.log('OpenAI Service - Classifying email for photographer business');

    // Check if OpenAI API key is available
    if (!config.openai.apiKey) {
      console.warn('OpenAI API key not found. Using fallback classification method.');
      return fallbackClassification(text);
    }

    try {
      // Prepare the prompt for OpenAI
      const prompt = `
You are an assistant for a photographer and video business. Given this email, decide whether a reply can be drafted using general information and templates ('auto_draft'), or if the assistant should ask the user for specific answers first ('needs_input'). Also extract any clear questions the email contains.

Classify this email based on whether the assistant can draft a helpful reply using general knowledge and past examples, or if it needs the human to provide more information first.

EMAIL:
"""
${text}
"""

Respond with ONLY valid JSON, no code blocks or formatting, in this exact format:
{
  "classification": "auto_draft" or "needs_input",
  "questions": ["extracted question 1", "extracted question 2", ...],
  "reasoning": "brief explanation of why this classification was chosen"
}`;

      // Make request to OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openai.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Using the latest model, adjust as needed
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3, // Lower temperature for more consistent outputs
          max_tokens: 500,
          response_format: { type: "json_object" } // Request JSON format explicitly
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse the JSON response using our helper function
      let parsedResult;
      try {
        parsedResult = extractJsonFromMarkdown(content);
        console.log('Successfully parsed OpenAI response');
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.error('Raw response:', content);
        throw new Error('Failed to parse OpenAI response as JSON');
      }

      // Ensure the response has the expected format
      return {
        classification: parsedResult.classification || 'needs_input',
        questions: Array.isArray(parsedResult.questions) ? parsedResult.questions : [],
        reasoning: parsedResult.reasoning || 'No reasoning provided',
        timestamp: new Date().toISOString()
      };

    } catch (apiError) {
      console.error('Error calling OpenAI API:', apiError);
      console.warn('Falling back to local classification method');
      return fallbackClassification(text);
    }
  } catch (error) {
    console.error('Error in classifyEmailForPhotographer:', error);
    throw new Error('Failed to classify email: ' + error.message);
  }
};

/**
 * Fallback classification method when OpenAI API is unavailable
 * @param {string} text - The email text content to analyze
 * @returns {Object} - Classification and extracted questions
 */
const fallbackClassification = (text) => {
  // Extract questions using regex
  const questionRegex = /\b(?:who|what|when|where|why|how|can you|could you|would you|will you|is there|are there|do you|did you|have you|has|should|shall|may I|are we|is it)\b.*\?/gi;
  const questions = text.match(questionRegex) || [];
  
  // Check for photography-specific requests that typically need input
  const needsInputPatterns = [
    /\b(?:price|pricing|quote|cost|rate|package|budget)/i,
    /\b(?:availab|schedule|book|date|time|calendar)/i,
    /\b(?:location|venue|address|place|site)/i,
    /\b(?:custom|specific|particular|exact)/i,
    /what (?:type|kind|style)/i
  ];
  
  // Check if any of the patterns that typically need input are present
  const needsInput = needsInputPatterns.some(pattern => pattern.test(text)) || 
                    questions.length > 0 ||
                    text.includes('?');
  
  return {
    classification: needsInput ? 'needs_input' : 'auto_draft',
    questions: questions.map(q => q.trim()),
    reasoning: needsInput ? 
      "Contains specific questions or requests that require custom information" : 
      "Can be handled with general information",
    timestamp: new Date().toISOString()
  };
};

/**
 * Generate a reply to an email
 * @param {Object} originalEmail - The email to reply to
 * @param {string} originalEmail.subject - Email subject
 * @param {string} originalEmail.body - Email body content
 * @param {string} originalEmail.sender - Email sender
 * @param {string} [originalEmail.category] - Optional email category from classification
 * @param {Object|null} answers - Optional answers provided by the user via SMS
 * @returns {Promise<Object>} - Generated reply
 */
export const generateReply = async (originalEmail, answers = null) => {
  try {
    const { subject, body, sender, category } = originalEmail;
    
    console.log('OpenAI Service - Generating reply:');
    console.log(`To: ${sender}`);
    console.log(`Subject: ${subject}`);
    console.log(`Category: ${category || 'Not classified'}`);
    
    // Check if OpenAI API key is available
    if (!config.openai.apiKey) {
      console.warn('OpenAI API key not found. Using fallback reply method.');
      // Fallback to simple reply when API is unavailable
      const replyContent = `Hello,\n\nThank you for your email regarding "${subject}". I'll get back to you with more information soon.\n\nBest regards,\nEmail Assistant`;
      
      return {
        replyText: replyContent,
        suggestedSubject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        tone: 'professional',
        timestamp: new Date().toISOString(),
      };
    }

    // Prepare the content for OpenAI prompt
    let answersContent = '';
    if (answers && Object.keys(answers).length > 0) {
      answersContent = "User's answers to specific questions:\n";
      for (const [question, answer] of Object.entries(answers)) {
        answersContent += `Question: ${question}\nAnswer: ${answer}\n\n`;
      }
    }

    // Prepare the prompt for OpenAI
    const prompt = `
You are an assistant for a photo/video business. Using the email below and the provided answers, write a friendly, professional reply that matches the user's usual tone. Reply in complete sentences with helpful detail.

ORIGINAL EMAIL:
From: ${sender}
Subject: ${subject}
Body:
${body}

${answersContent ? answersContent : 'No specific answers were provided by the business owner.'}

Write only the body of the reply email. Do not include any headers, signatures, or formatting outside the actual reply content. Reply as if you are the business owner.`;

    // Make request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openai.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using the latest model, adjust as needed
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const replyContent = data.choices[0].message.content.trim();
    
    return {
      replyText: replyContent,
      suggestedSubject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
      tone: 'professional',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in OpenAI service:', error);
    throw new Error('Failed to generate reply: ' + error.message);
  }
};

/**
 * Summarize an email thread
 * @param {Array} thread - Array of email objects in a thread
 * @returns {Promise<Object>} - Thread summary
 */
export const summarizeThread = async (thread) => {
  try {
    // This is a placeholder for the actual OpenAI API implementation
    console.log(`OpenAI Service - Summarizing thread with ${thread.length} emails`);
    
    // Mock summary - in real implementation, this would use OpenAI API
    return {
      summary: 'This is a placeholder summary of the email thread.',
      keyPoints: [
        'First placeholder key point',
        'Second placeholder key point',
      ],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in OpenAI service:', error);
    throw new Error('Failed to summarize thread: ' + error.message);
  }
};

export default {
  classifyEmail,
  classifyEmailText,
  classifyEmailForPhotographer,
  generateReply,
  summarizeThread,
}; 