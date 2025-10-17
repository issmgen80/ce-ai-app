// backend/utils/contentFilter.js

// Blocked words list (profanity and offensive terms)
const BLOCKED_WORDS = [
  // Profanity
  "fuck",
  "shit",
  "bitch",
  "bastard",
  "asshole",
  "dick",
  "cock",
  "pussy",
  "cunt",
  "fucking",

  // Offensive/discriminatory
  // Add terms based on your policy
];

// Spam patterns
const SPAM_PATTERNS = [
  /(.)\1{10,}/i, // Repeated character 10+ times: "aaaaaaaaaa"
  /^[A-Z\s!?]{20,}$/, // All caps 20+ chars: "HELLO WHAT CAR"
  /[!?]{5,}/, // Excessive punctuation: "!!!!!"
  /<script/i, // Script tags (XSS)
  /javascript:/i, // JavaScript protocol
  /(DROP|DELETE|INSERT|UPDATE)\s+(TABLE|DATABASE)/i, // SQL injection
];

/**
 * Check if message contains blocked content
 * @param {string} message - User message to check
 * @returns {object} - { blocked: boolean, reason: string }
 */
const checkContent = (message) => {
  const lowerMessage = message.toLowerCase();

  // Check for blocked words
  for (const word of BLOCKED_WORDS) {
    if (lowerMessage.includes(word)) {
      return {
        blocked: true,
        reason: "Please keep the conversation professional and appropriate.",
      };
    }
  }

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        reason:
          "Please send normal messages without spam or repetitive content.",
      };
    }
  }

  return { blocked: false };
};

/**
 * Check for repeated messages (requires message history)
 * @param {string} currentMessage - Current message
 * @param {array} recentMessages - Last few messages
 * @returns {boolean} - True if message is repeated
 */
const isRepeatedMessage = (currentMessage, recentMessages = []) => {
  if (recentMessages.length === 0) return false;

  // Check if same message sent in last 5 messages
  const lastFive = recentMessages.slice(-5);
  const repeatedCount = lastFive.filter(
    (msg) => msg.role === "user" && msg.content === currentMessage
  ).length;

  return repeatedCount >= 2; // Same message 2+ times = spam
};

module.exports = {
  checkContent,
  isRepeatedMessage,
};
