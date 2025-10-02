const express = require("express");
const { searchVehicles } = require("../utils/vectorSearchEngine");
const { rankByVFACTS } = require("../utils/vfactsRanking");
const { loadResults } = require("../utils/resultDataLoader"); // ADD THIS

const router = express.Router();

router.post("/vector-search", async (req, res) => {
  try {
    console.log("🔍 Vector search request received");

    const { vectorRequirements, vehicleIds } = req.body;

    // Validation
    if (!vectorRequirements || !vehicleIds) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: vectorRequirements and vehicleIds",
      });
    }

    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "vehicleIds must be a non-empty array",
      });
    }

    console.log(
      `📊 Search params: ${vehicleIds.length} vehicles, requirements: "${vectorRequirements}"`
    );

    const { analyzeVehicleResults } = require("../utils/claudeAnalyzer");

    const startTime = Date.now();

    // Step 1: Vector search
    const results = await searchVehicles(vectorRequirements, vehicleIds, 5);

    // Step 2: Claude analysis
    const claudeAnalysis = await analyzeVehicleResults(
      results,
      vectorRequirements
    );

    // Check if empty
    if (
      !claudeAnalysis.rankedVehicles ||
      claudeAnalysis.rankedVehicles.length === 0
    ) {
      const searchTime = Date.now() - startTime;
      return res.json({
        success: false,
        error:
          "No vehicles matched your specific requirements. Try adjusting your criteria or being less specific.",
        results: [],
        metadata: {
          searchTime: `${searchTime}ms`,
          inputVehicles: vehicleIds.length,
          foundVehicles: results.length,
          qualifiedVehicles: 0,
        },
      });
    }

    // Step 3: VFACTS ranking
    const vfactsRanked = await rankByVFACTS(claudeAnalysis);

    // Step 4: Load complete vehicle data
    const completeResults = await loadResults(vfactsRanked.rankedVehicleIds);

    // Step 5: Merge metadata (matchConfidence, reasoning) back into results
    const finalResults = completeResults.map((vehicle, index) => ({
      ...vehicle,
      matchConfidence: vfactsRanked.metadata[index]?.matchConfidence || 0,
      reasoning: vfactsRanked.metadata[index]?.reasoning || "",
      salesVolume: vfactsRanked.metadata[index]?.salesVolume || 0,
    }));

    const searchTime = Date.now() - startTime;

    // Return results
    res.json({
      success: true,
      results: finalResults, // Use finalResults instead of completeResults
      // ... rest of response
    });
  } catch (error) {
    console.error("🚨 Vector search error:", error);
    res.status(500).json({
      success: false,
      error: "Vector search failed",
      message: error.message,
    });
  }
});

router.get("/vector-search/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Vector search endpoint healthy",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
