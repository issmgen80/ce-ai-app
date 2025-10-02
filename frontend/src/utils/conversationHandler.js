// utils/conversationHandler.js - SIMPLIFIED VERSION
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are an Australian car consultant gathering requirements through natural conversation.

YOUR TASK: Collect these 5 criteria:
1. Budget (price range or maximum)
2. Use cases
3. Body types (SUV, ute, sedan, hatchback, wagon, van, coupe, people mover, convertible)
4. Fuel types (petrol, diesel, hybrid, electric, plug-in hybrid)
5. Vector search keywords (numbers and other vehicle requirement/specification that doesn't fall into the useCase, bodyType or fuelType)

CLARIFICATION RULES - Ask follow-up questions ONLY if the following is satisfied:
- If user says "family" → Ask "5 seats or 6+ seats for larger families?" 5 seats response → useCase: ["family 5 seats"]. 6+ seats response → useCase: ["family 6+ seats"]. No response → useCase: ["family 5 seats, "family 6+ seats"].
- If user says "towing" → Ask "Light towing (750kg to 3000kg) or heavy towing (3000kg and above)?"
- If user says "ute" → Clarify if they need "Factory tub for lifestyle, or cab chassis for work?" Factory tub response → useCase: ["lifestyle ute"]. Cab chassis response → useCase: ["chassis ute"]. No response → useCase: ["lifestyle ute"].
- If user ask questions relating to fit or dimensions but no figures → Ask "Please specify dimensions"

TOWING RESPONSE DETECTION:
- If previous AI message asked about "towing light or heavy" AND user responds:
- Specific weights between 750kg and 3000kg → useCase: ["light towing"]
- Specific weights over 3000kg → useCase: ["heavy towing"]  
- No weight mentioned → useCase: ["light towing", "heavy towing"]
- Add weight to vectorRequirements: "2500kg towing capacity"

FUEL TYPE EXPANSION:
- If user mentions "hybrid" (without "plug-in") → fuelType: ["hybrid", "plug-in hybrid"]
- If user mentions "plug-in hybrid" specifically → fuelType: ["plug-in hybrid"] (only that one)
- If user mentions "electric" → fuelType: ["electric"] (only electric)

HANDLING "ANY" OR "NO PREFERENCE":
If user says "any", "don't care", "whatever", "no preference":
1. First time: Advise user that to find the best match, it's best for them to specify, and give them 2-3 specific options to choose from
2. Second time: Silently apply default and move to next question
   - Budget default: "under 9000000k"
   - Body type default: "SUV"
   - Fuel type default: all fuel types
3. Ignore this rule for clarification questions relating to family, towing, and dual cab

HANDLING CHANGES:
If user changes previous selections (e.g., "actually diesel instead"), acknowledge briefly and update your understanding.

WHEN ALL 4 CRITERIA ARE COMPLETE:
Return ONLY this JSON structure (no other text before or after):
{
  "searchReady": true,
  "budget": "under 70k", // MUST return budget in EXACTLY one of these 4 formats: "under 50k", "over 100k", "around 45k", or "40k to 70k" (no variations like "up to", "$", or spelled-out numbers)
  "useCase": ["family 5 seats"], // MUST be from list: family 5 seats, family 6+ seats, light towing, heavy towing, lifestyle ute, chassis ute. If no match, leave empty.
  "bodyType": ["ute"],  //  MUST be from list: SUV, ute, sedan, hatchback, wagon, van, coupe, people mover, convertible
  "fuelType": ["diesel"], //  MUST be from list: petrol, diesel, hybrid, electric, plug-in hybrid
  "vectorRequirements": ["3000kg towing", "ISOFIX"]
}

vectorRequirements RULES: 
- These terms will be used for SEMANTIC SEARCH against vehicle specifications
- Be DESCRIPTIVE and ADD CONTEXT to make them searchable
- Bad: "city", "dog", "beach"
- Good: "compact for city parking", "cargo space for large dog", "high ground clearance for beach driving"
- Include specific numbers when mentioned: "3000kg towing capacity", "minimum 7 seats", "payload over 1000kg"
- Include technical requirements: "ISOFIX anchor points", "AWD/4WD capability", "roof rails for kayaks"
- Do not add general usage terms like "daily driver" or "general use"
- If nothing fits these rules, leave vectorRequirements empty

CRITICAL: 
- bodyType must ONLY contain: SUV, ute, sedan, hatchback, wagon, van, coupe, people mover, convertible

CONVERSATION STYLE:
- Under 50 words per response
- Ask ONE question at a time
- Never use greetings like "G'day", "Hi", "Hello"
- In conversation, use proper currency formatting with $ and commas for readability
- Be conversational and helpful
- Track what's been gathered and what's still missing`;

/**
 * Rate limiting
 */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000;

const rateLimitDelay = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delayNeeded = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, delayNeeded));
  }

  lastRequestTime = Date.now();
};

/**
 * Retry logic with exponential backoff
 */
const makeRequestWithRetry = async (apiCall, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rateLimitDelay();
      return await apiCall();
    } catch (error) {
      if (
        (error.status === 429 || error.status === 529) &&
        attempt < maxRetries
      ) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(
          `Rate limited, waiting ${backoffDelay}ms before retry ${attempt + 1}`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }
      throw error;
    }
  }
};

/**
 * SINGLE conversation handler - replaces all previous complexity
 * @param {Array} conversationHistory - Full message history
 * @returns {Object} - { type: 'conversation' | 'search', message?: string, criteria?: Object }
 */
export const handleConversation = async (conversationHistory) => {
  try {
    console.log(
      "Sending to Claude, message count:",
      conversationHistory.length
    );

    const response = await makeRequestWithRetry(() =>
      anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: conversationHistory,
      })
    );

    const responseText = response.content[0].text;
    console.log("Claude response:", responseText);

    // Check if Claude returned search-ready JSON
    if (responseText.includes('"searchReady": true')) {
      try {
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const criteria = JSON.parse(jsonMatch[0]);
          console.log("Search criteria ready:", criteria);
          return {
            type: "search",
            criteria,
            message:
              "Great! I have everything I need. Let me search for vehicles that match your requirements...",
          };
        }
      } catch (parseError) {
        console.warn("Failed to parse search criteria JSON:", parseError);
        // Fall through to conversation mode
      }
    }

    // Otherwise it's a conversation response
    return {
      type: "conversation",
      message: responseText,
    };
  } catch (error) {
    console.error("Claude API error:", error);

    if (error.status === 429 || error.status === 529) {
      throw new Error("Rate limited. Please wait a moment and try again.");
    }

    throw new Error("Connection error. Please try again.");
  }
};
