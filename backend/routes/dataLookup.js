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

    // Step 2.5: Force-fetch fuel specifications for all found vehicles
    if (results && results.length > 0) {
      const { Pool } = require("pg");
      const pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes("railway.app")
          ? { rejectUnauthorized: false }
          : false,
      });

      const vehicleIds = results.map((r) => r.vehicleId);

      const fuelSpecQuery = `
    SELECT vehicle_id, content, category
    FROM vehicle_chunks 
    WHERE vehicle_id = ANY($1)
      AND category = 'feature_fuel_specifications'
  `;

      const fuelSpecResult = await pgPool.query(fuelSpecQuery, [vehicleIds]);

      // Merge fuel specs into each vehicle's relevantChunks
      fuelSpecResult.rows.forEach((fuelSpec) => {
        const vehicle = results.find(
          (v) => v.vehicleId === fuelSpec.vehicle_id
        );
        if (vehicle) {
          // Check if not already included
          const alreadyHasFuelSpec = vehicle.relevantChunks.some(
            (chunk) => chunk.category === "feature_fuel_specifications"
          );

          if (!alreadyHasFuelSpec) {
            vehicle.relevantChunks.push({
              category: fuelSpec.category,
              content: fuelSpec.content,
              similarity: 0.5, // Fixed similarity for forced inclusion
            });
          }
        }
      });

      console.log(
        `✅ Added fuel specifications to ${fuelSpecResult.rows.length} vehicles`
      );
    }

    // Step 3: Use Claude to answer the question (pass full vehicle name for variant context)
    const answer = await answerVehicleQuestion(
      results,
      vehicleQuery,
      vehicleName
    );

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
