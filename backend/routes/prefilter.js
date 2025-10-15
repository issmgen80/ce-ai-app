// backend/routes/prefilter.js
const express = require("express");
const router = express.Router();

const {
  convertToJatoLabels,
  validateJatoFilters,
} = require("../utils/jatoConverter");
const {
  scanJatoDatabase,
  validateScanFilters,
  getNoMatchesMessage,
} = require("../utils/jatoScanner");

/**
 * POST /api/prefilter
 * Pre-filters JATO database before vector search
 * Input: { budget, useCase, bodyType, fuelType, vectorRequirements }
 * Output: { success, vehicleIds, matchCount } or { success: false, message }
 */
router.post("/prefilter", async (req, res) => {
  try {
    const { budget, useCase, bodyType, fuelType, vectorRequirements } =
      req.body;

    console.log("🔍 PRE-FILTER REQUEST:");
    console.log("  Budget:", budget);
    console.log("  Use Case:", useCase);
    console.log("  Body Type:", bodyType);
    console.log("  Fuel Type:", fuelType);
    console.log("  Vector Requirements:", vectorRequirements);

    // Validation
    if (!budget || !useCase || !bodyType || !fuelType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: budget, useCase, bodyType, fuelType",
      });
    }

    // Step 1: Convert natural language to JATO labels
    console.log("🔄 Converting to JATO labels...");
    const jatoFilters = await convertToJatoLabels({
      budget,
      useCase,
      bodyType,
      fuelType,
      vectorRequirements: vectorRequirements || [],
    });

    // Step 2: Validate JATO filters
    if (!validateJatoFilters(jatoFilters)) {
      return res.status(400).json({
        success: false,
        error: "Invalid JATO filter conversion",
      });
    }

    const scanValidation = validateScanFilters(jatoFilters);
    if (!scanValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Filter validation failed: ${scanValidation.errors.join(", ")}`,
      });
    }

    // Step 3: Scan JATO database
    console.log("📊 Scanning JATO database...");
    const scanResults = scanJatoDatabase(jatoFilters);

    console.log(
      `✅ Pre-filter complete: ${scanResults.matchCount} vehicles found`
    );

    // Step 4: Handle no matches
    if (scanResults.matchCount === 0) {
      const noMatchMessage = getNoMatchesMessage(jatoFilters);
      return res.json({
        success: false,
        matchCount: 0,
        message: noMatchMessage,
      });
    }

    // Step 5: Return vehicle IDs for vector search
    res.json({
      success: true,
      vehicleIds: scanResults.vehicleIds,
      matchCount: scanResults.matchCount,
      vectorRequirements: jatoFilters.vectorRequirements,
    });
  } catch (error) {
    console.error("❌ Pre-filter error:", error);
    res.status(500).json({
      success: false,
      error: "Pre-filtering failed",
      message: error.message,
    });
  }
});

/**
 * GET /api/prefilter/health
 * Health check for pre-filter endpoint
 */
router.get("/prefilter/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Pre-filter endpoint healthy",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
