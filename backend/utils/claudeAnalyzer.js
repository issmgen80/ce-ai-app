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

    const prompt = `You are an automotive expert. Analyze these vehicles against user requirements using a hybrid approach:

STEP 1: ELIMINATE vehicles that fail absolute requirements (dimensions, hard constraints)
STEP 2: RANK remaining vehicles by overall match quality (0-100 score)

USER REQUIREMENTS: ${
      Array.isArray(userRequirements)
        ? userRequirements.join(", ")
        : userRequirements
    }

CALCULATION REQUIREMENTS:
If user asks for ratios or calculations (power-to-weight, fuel efficiency comparisons, etc.):
1. Extract the necessary data from vehicle chunks (power, weight, fuel consumption, etc.)
2. Perform the calculation using the actual data

BRAND FILTERING RULE:
If user requirements mention specific brand(s) (e.g., "Toyota", "BMW"), check each vehicle's identity data for brand match. Set matchConfidence to 0 for non-matching brands and exclude from final output.

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

ANALYSIS INSTRUCTIONS:
1. BRAND CHECK: If specific brands requested, eliminate vehicles with non-matching brands (set to 0% confidence)
2. First eliminate any vehicles that fail hard constraints (garage fit, minimum towing, specific body type requirements, etc.)
3. For remaining vehicles, score 0-100 based on how well they match user preferences
4. Focus on actual data in the chunks - don't assume specs not present
5. Keep reasoning brief (1-2 sentences max per vehicle), and only what is specifically related to USER REQUIREMENTS

SCORING GUIDE:
- 90-100: Exceeds requirements significantly  
- 80-89: Meets all requirements well
- 70-79: Meets most requirements adequately
- 60-69: Meets some requirements, gaps in others
- Below 60: Poor match or insufficient data

Return ONLY the top 10 vehicles in this JSON format:
{
  "rankedVehicles": [
    {
      "vehicleId": "8410315",
      "matchConfidence": 87,
      "reasoning": "Large SUV with excellent interior space and premium comfort features."
    }
  ]
}
  
CRITICAL:
- Always include calculated result of user requierement in reasoning.

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
      console.log("❌ No ranked vehicles found in response");
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
