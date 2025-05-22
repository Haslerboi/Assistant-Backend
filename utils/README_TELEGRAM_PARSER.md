# Telegram Parser

This utility provides functionality for parsing and formatting messages sent to and from Telegram.

## Handling Numbered Answers

The main function of this parser is to extract numbered answers from user replies. This is particularly useful when you ask a set of questions and expect the user to reply with answers in a specific format.

### Expected Format

Users should provide answers in the following format:

```
1. Yes, I'm available
2. $1300 + GST
3. Friday afternoon
```

The parser is flexible and can handle various separators between the number and the answer:

- `1. Answer` (with period)
- `1: Answer` (with colon)
- `1- Answer` (with dash)
- `1) Answer` (with parenthesis)
- `1 Answer` (with just a space)

### Usage

```javascript
import telegramParser from '../utils/telegramParser.js';

// Example user response
const messageText = `1. Yes, I'm available
2. $1300 + GST
3. Friday afternoon works best`;

// Parse the response
const answers = telegramParser.parseNumberedAnswers(messageText);

// Result will be:
// {
//   '1': "Yes, I'm available",
//   '2': '$1300 + GST',
//   '3': 'Friday afternoon works best'
// }
```

### Formatting Questions

When sending questions to a user, format them using the `formatNumberedQuestions` function:

```javascript
const questions = [
  'Are you available on June 15th?',
  'What is your pricing for an 8-hour package?',
  'Do you offer engagement sessions?'
];

const formattedQuestions = telegramParser.formatNumberedQuestions(questions);
// Result:
// 1. Are you available on June 15th?
// 2. What is your pricing for an 8-hour package?
// 3. Do you offer engagement sessions?
```

### Backward Compatibility

The parser includes a function to convert the old Q1/Q2 format to the new numbered format:

```javascript
const oldFormat = `New client email:
Q1: Are you available for a wedding?
Q2: What is your pricing?`;

const convertedFormat = telegramParser.convertQFormatToNumbered(oldFormat);
// Result:
// New client email:
// 1. Are you available for a wedding?
// 2. What is your pricing?
```

## Notes for Future Development

- Consider adding support for more complex answer formats
- Add validation for expected question numbers
- Implement automatic mapping of answers to question text 