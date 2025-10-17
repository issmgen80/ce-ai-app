// backend/routes/dataLookup.js
const express = require("express");
const { searchAllVehicles } = require("../utils/vectorSearchEngine");
const { detectCategories } = require("../utils/categoryDetector");
const { answerVehicleQuestion } = require("../utils/qaAnalyzer");

const router = express.Router();

router.post("/data-lookup", async (req, res) => {
  try {
    console.log("🔍 Data lookup request received");

    const { vehicleQuery, vehicleName } = req.body;

    // Validation
    if (!vehicleQuery || !vehicleName) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: vehicleQuery and vehicleName",
      });
    }

    console.log(`🎯 Query: "${vehicleQuery}"`);
    console.log(`🚗 Vehicle: "${vehicleName}"`);

    const startTime = Date.now();

    // Step 1: Detect relevant categories from question
    const categories = detectCategories(vehicleQuery);

    // Step 2: Vector search all vehicles (no pre-filtering)
    const results = await searchAllVehicles(
      vehicleQuery,
      vehicleName,
      categories
    );

    if (!results || results.length === 0) {
      return res.json({
        success: true,
        answer: `I couldn't find information about the ${vehicleName} in my database. Please check the spelling or try a different vehicle.`,
        vehiclesFound: 0,
        chunksAnalyzed: 0,
        searchTime: `${Date.now() - startTime}ms`,
      });
    }

    // Step 3: Use Claude to answer the question
    const answer = await answerVehicleQuestion(results, vehicleQuery);

    // Step 4: Calculate metrics
    const totalChunks = results.reduce(
      (sum, v) => sum + v.relevantChunks.length,
      0
    );
    const searchTime = Date.now() - startTime;

    console.log(`✅ Data lookup complete: ${searchTime}ms`);

    res.json({
      success: true,
      answer,
      vehiclesFound: results.length,
      chunksAnalyzed: totalChunks,
      searchTime: `${searchTime}ms`,
    });
  } catch (error) {
    console.error("🚨 Data lookup error:", error);
    res.status(500).json({
      success: false,
      error: "Data lookup failed",
      message: error.message,
    });
  }
});

router.get("/data-lookup/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Data lookup endpoint healthy",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
