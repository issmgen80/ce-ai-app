const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const analyzeVehicleResults = async (vehicleResults, userRequirements) => {
  try {
    console.log(`\n🧠 CLAUDE ANALYSIS: ${vehicleResults.length} vehicles`);
    console.log(
      `🎯 Requirements: ${
        Array.isArray(userRequirements)
          ? userRequirements.join(", ")
          : userRequirements
      }`
    );

    // Format vehicles for Claude with clean structure
    const vehicleData = vehicleResults.map((vehicle) => ({
      vehicleId: vehicle.vehicleId,
      make: vehicle.make,
      identity: vehicle.identityContent,
      avgSimilarity: vehicle.avgSimilarity,
      maxSimilarity: vehicle.maxSimilarity,
      chunkData: vehicle.relevantChunks
        .map((chunk) => `[${chunk.category}] ${chunk.content}`)
        .join("\n"),
    }));

    const prompt = `You are an automotive expert analyzing vehicles against specific user requirements.

USER REQUIREMENTS: ${
      Array.isArray(userRequirements)
        ? userRequirements.join(", ")
        : userRequirements
    }

CRITICAL ANALYSIS RULES:

1. HARD REQUIREMENTS (MUST ELIMINATE if not met):
   - Specific drivetrain types: "full-time 4WD", "part-time 4WD", "AWD"
   - Specific configurations: "dual cab", "single cab", "chassis cab"
   - Minimum towing capacity: If user specifies "3500kg towing", vehicle must have ≥3500kg
   - Minimum payload: If specified, vehicle must meet or exceed
   - Minimum seats: If "7 seats", vehicle must have ≥7 seats
   - Maximum dimensions: If "fits in 2.1m garage", vehicle height must be <2.1m
   - Brand requirements: If specific brand mentioned, exclude all other brands

2. SOFT REQUIREMENTS (AFFECT SCORING, DON'T ELIMINATE):
   - "Good off-road capability" (subjective)
   - "Comfortable", "reliable", "practical" (preferences)
   - "Fuel efficient" (relative term)
   - "Spacious interior" (subjective)

3. PATTERN RECOGNITION FOR UNLISTED REQUIREMENTS:
   When encountering requirements not explicitly listed above, use these rules:
   
   TREAT AS HARD (eliminate if not met):
   - Exact technical specifications with numbers: "200mm ground clearance", "automatic transmission only"
   - Specific feature requirements: "diesel engine", "sunroof", "leather seats"
   - Language indicating mandatory: "must have", "required", "need", "only", "specifically"
   - Binary features: "electric", "manual", "diesel" (not "diesel or petrol")
   
   TREAT AS SOFT (affects scoring):
   - Qualitative/subjective descriptions: "good clearance", "comfortable ride", "spacious"
   - Preference language: "prefer", "would like", "ideally", "nice to have"
   - Relative terms: "fuel efficient", "powerful", "quiet", "smooth"
   - Vague quantities: "lots of space", "plenty of power"
   
   WHEN IN DOUBT:
   - If requirement includes specific number/measurement → HARD
   - If requirement is binary choice (X or nothing) → HARD
   - If requirement allows interpretation → SOFT

4. ELIMINATION PROCESS:
   - Read user requirements carefully
   - Apply pattern recognition to classify each requirement as HARD or SOFT
   - For each vehicle, check if it FAILS any hard requirement
   - If vehicle fails ANY hard requirement → SET matchConfidence to 0 and reasoning to why it was eliminated
   - Vehicles with matchConfidence 0 will be filtered out
   - Only rank vehicles that pass ALL hard requirements

5. SCORING PROCESS (for vehicles that passed elimination):
   - 90-100: Exceeds requirements significantly
   - 80-89: Meets all requirements well
   - 70-79: Meets most requirements adequately
   - 60-69: Meets some requirements, gaps in others
   - Below 60: Marginal match

EXAMPLES OF ELIMINATION:

User requirement: "full-time 4WD"
- Vehicle has "part-time 4WD" → matchConfidence: 0, reasoning: "Part-time 4WD only, does not meet full-time 4WD requirement"

User requirement: "3500kg towing"
- Vehicle has 3000kg towing → matchConfidence: 0, reasoning: "3000kg towing capacity insufficient for 3500kg requirement"

User requirement: "7 seats"
- Vehicle has 5 seats → matchConfidence: 0, reasoning: "5 seats insufficient for 7-seat requirement"

VEHICLES TO ANALYZE:
${vehicleData
  .map(
    (v, i) => `
--- VEHICLE ${i + 1} ---
ID: ${v.vehicleId}
IDENTITY: ${v.identity}
SIMILARITY: Avg ${v.avgSimilarity.toFixed(3)}, Max ${v.maxSimilarity.toFixed(3)}

TECHNICAL DATA:
${v.chunkData}
`
  )
  .join("\n")}

RESPONSE FORMAT:
Return ONLY this JSON structure (no markdown, no extra text):
{
  "rankedVehicles": [
    {
      "vehicleId": "XXXXXX",
      "matchConfidence": XX,
      "reasoning": "TEXT"
    }
  ]
}

CRITICAL REMINDERS:
- If a vehicle fails a hard requirement, set matchConfidence to 0
- Vehicles with matchConfidence 0 will be automatically filtered out
- Only include vehicles that genuinely meet the user's specific requirements
- Be strict with hard requirements like drivetrain types, capacities, and configurations
- Keep reasoning brief (1-2 sentences max)
`;

    console.log("📤 Sending to Claude Sonnet 4...");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    console.log("📥 Claude response received");

    // Clean and parse response
    const cleanResponse = response.content[0].text
      .replace(/```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let analysisResult;
    try {
      analysisResult = JSON.parse(cleanResponse);
      console.log(
        `✅ Parsed successfully: ${
          analysisResult.rankedVehicles?.length || 0
        } vehicles ranked`
      );
    } catch (parseError) {
      console.log("⚠️ JSON parsing failed, attempting extraction...");
      console.log("RAW CLAUDE RESPONSE:", cleanResponse.substring(0, 500));
      console.log("...");
      console.log(
        "ENDING:",
        cleanResponse.substring(cleanResponse.length - 500)
      );
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
        console.log(
          `✅ Extracted successfully: ${
            analysisResult.rankedVehicles?.length || 0
          } vehicles ranked`
        );
      } else {
        throw new Error("Could not parse Claude response as JSON");
      }
    }

    // Filter out vehicles with 0 confidence (failed hard requirements)
    if (analysisResult.rankedVehicles) {
      const beforeCount = analysisResult.rankedVehicles.length;
      analysisResult.rankedVehicles = analysisResult.rankedVehicles.filter(
        (v) => v.matchConfidence > 0
      );
      const afterCount = analysisResult.rankedVehicles.length;

      if (beforeCount > afterCount) {
        console.log(
          `🚫 Filtered out ${
            beforeCount - afterCount
          } vehicles that failed hard requirements`
        );
      }
    }

    // Debug output - display results in terminal
    console.log("\n" + "=".repeat(80));
    console.log("🏆 CLAUDE ANALYSIS RESULTS");
    console.log("=".repeat(80));

    if (
      analysisResult.rankedVehicles &&
      analysisResult.rankedVehicles.length > 0
    ) {
      analysisResult.rankedVehicles.forEach((vehicle, index) => {
        console.log(`\n${index + 1}. VEHICLE ID: ${vehicle.vehicleId}`);
        console.log(`   MATCH CONFIDENCE: ${vehicle.matchConfidence}%`);
        console.log(`   REASONING: ${vehicle.reasoning}`);

        // Find original vehicle data to show identity
        const originalVehicle = vehicleResults.find(
          (v) => v.vehicleId === vehicle.vehicleId
        );
        if (originalVehicle) {
          console.log(`   IDENTITY: ${originalVehicle.identityContent}`);
        }
      });
    } else {
      console.log("❌ No vehicles passed requirements");
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ CLAUDE ANALYSIS COMPLETE");
    console.log("=".repeat(80));

    return analysisResult;
  } catch (error) {
    console.error(`\n❌ Claude Analysis Error: ${error.message}`);
    throw error;
  }
};

module.exports = { analyzeVehicleResults };
