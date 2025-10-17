// backend/utils/qaAnalyzer.js
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Answer specific vehicle data questions using Claude Haiku 4.5
 * @param {Array} vehicleResults - Array of vehicles with chunks
 * @param {string} userQuestion - Original user question
 * @returns {string} - Natural language answer
 */
const answerVehicleQuestion = async (vehicleResults, userQuestion) => {
  try {
    console.log(`\n🤖 Q&A ANALYSIS: ${vehicleResults.length} vehicles`);
    console.log(`❓ Question: ${userQuestion}`);

    // Format vehicles for Claude
    const vehicleData = vehicleResults.map((vehicle) => ({
      vehicleId: vehicle.vehicleId,
      identity: vehicle.identityContent,
      chunkData: vehicle.relevantChunks
        .map((chunk) => `[${chunk.category}] ${chunk.content}`)
        .join("\n"),
    }));

    const prompt = `You are answering a specific question about vehicle data from an Australian car database.

USER QUESTION: "${userQuestion}"

VEHICLE DATA FROM DATABASE:
${vehicleData
  .map(
    (v) => `
${v.identity}

SPECIFICATIONS:
${v.chunkData}

---
`
  )
  .join("\n")}

RESPONSE RULES:

1. ANSWER FORMAT:
   - Use RANGE FORMAT for multi-variant data: "7.8-8.5 L/100km"
   - Single sentence when possible
   - Be concise and direct
   - NO headers (no #)
   - Example: "The Toyota Hilux has fuel economy ranging from 7.8-8.5 L/100km depending on variant."

2. MISSING DATA:
   - If data NOT found in chunks, say: "I couldn't find [data point] information for the [vehicle name] in my database."
   - Never hallucinate or use training data
   - Suggest alternative data if relevant: "Would you like to know about other [category] features?"

3. DATA EXTRACTION:
   - Extract ALL variants' data points
   - Present as range: minimum-maximum
   - For binary questions (Yes/No): Check if ANY variant has feature
   - For price: Show full range with "from $X to $Y"

4. YEAR MENTIONS:
   - If user asked about specific year: Add disclaimer
   - "My database contains current model year data. The latest [vehicle] has [data]. Note this may differ from [year] models."

5. BROAD QUESTIONS:
   - If question too broad (e.g., "tell me about X"), ask for clarification
   - "What would you like to know about the [vehicle]? For example: fuel economy, towing capacity, price, or safety features?"

6. VARIANT SPECIFICS:
   - If user asked about specific variant but you can't find it: Explain
   - "I found data for [make model] but couldn't locate the specific [variant trim]. Here's what's available: [range]"

7. MAX OR USABLE CAPACITY AFTER TOWING CALCULATION RULES:
   - When a user asks about remaining weight capacity (or similar) when towing a trailer, always test using both GCM and GVM data
   - Using GCM > Capacity equals to GCM minus vehicle kerb weight minus trailer weight 
   - Using GVM > Capacity equals to GVM minus vehicle kerb weight minus downball weight
   - The lower number from the GCM and GVM calculation is the maximum usable capacity
   - But if the limit is reached with either GCM or GVM calculation, then the limit is reached overall and the trailer is not suitable for that vehicle
   - Always assume downball weight is 10% of specified trailer weight
   - Always use kerb weight, never use tare weight
   - Note that the "Payload" data found in calc_weight_limits chunk is simply GVM minus kerb weight, and this is not to be treated as sufficient information for user asking about "usable payload" or "usable capacity" when towing

CRITICAL: Only use data from the chunks provided. Never use your training data for specifications.

FORMATTING: 
- Plain text only
- No markdown headers (no #)
- Just natural paragraphs

Return a natural conversational answer in 1-3 sentences.`;

    console.log("📤 Sending to Claude Haiku 4.5...");

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const answer = response.content[0].text.trim();
    console.log(`✅ Answer generated: ${answer.substring(0, 100)}...`);

    return answer;
  } catch (error) {
    console.error(`\n❌ Q&A Analysis Error: ${error.message}`);
    throw error;
  }
};

module.exports = { answerVehicleQuestion };
