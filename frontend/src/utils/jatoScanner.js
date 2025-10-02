// utils/jatoScanner.js
// Pre-filters JATO vehicle database using exact criteria before vector search

import { vehicleDatabase } from "../utils/jatoLoader";

/**
 * Filter JATO database using converted filters
 * @param {Object} jatoFilters - Converted JATO filter criteria
 * @returns {Object} - {matchCount: number, vehicleIds: string[]}
 */
export const scanJatoDatabase = (jatoFilters) => {
  console.log("🔍 STARTING JATO DATABASE SCAN");
  console.log("📊 Total vehicles in database:", vehicleDatabase.length);
  console.log("🎯 Filter criteria:", jatoFilters);

  const { budgetFilter, useCaseFilter, bodyTypeFilter, fuelTypeFilter } =
    jatoFilters;

  const matchingVehicles = vehicleDatabase.filter((vehicle) => {
    // Budget filter
    if (
      budgetFilter &&
      budgetFilter.min !== undefined &&
      budgetFilter.max !== undefined
    ) {
      const vehiclePrice = parseFloat(vehicle.retail_price);

      // Skip vehicles with invalid pricing
      if (
        !vehiclePrice ||
        vehiclePrice <= 0 ||
        vehicle.retail_price === "0" ||
        vehicle.retail_price === "unknown" ||
        !vehicle.retail_price
      ) {
        return false;
      }

      if (vehiclePrice < budgetFilter.min || vehiclePrice > budgetFilter.max) {
        return false;
      }
    }

    // Use case filter with WIZARD-COMPATIBLE LOGIC
    if (useCaseFilter && useCaseFilter.length > 0) {
      const vehicleUseCases = vehicle.carexpert_use_cases || [];

      // Separate categories that need OR logic (same as wizard)
      const familyUseCases = useCaseFilter.filter((uc) =>
        uc.includes("FAMILY_LIFE")
      );
      const towingUseCases = useCaseFilter.filter((uc) =>
        uc.includes("TOWING")
      );
      const offRoadUseCases = useCaseFilter.filter((uc) =>
        uc.includes("OFFROAD")
      );
      const otherUseCases = useCaseFilter.filter(
        (uc) =>
          !uc.includes("FAMILY_LIFE") &&
          !uc.includes("TOWING") &&
          !uc.includes("OFFROAD")
      );

      // Check family use cases with OR logic
      if (familyUseCases.length > 1) {
        const hasFamilyMatch = familyUseCases.some((useCase) =>
          vehicleUseCases.includes(useCase)
        );
        if (!hasFamilyMatch) return false;
      } else if (familyUseCases.length === 1) {
        if (!vehicleUseCases.includes(familyUseCases[0])) return false;
      }

      // Check towing use cases with OR logic
      if (towingUseCases.length > 1) {
        const hasTowingMatch = towingUseCases.some((useCase) =>
          vehicleUseCases.includes(useCase)
        );
        if (!hasTowingMatch) return false;
      } else if (towingUseCases.length === 1) {
        if (!vehicleUseCases.includes(towingUseCases[0])) return false;
      }

      // Check off-road use cases with OR logic
      if (offRoadUseCases.length > 1) {
        const hasOffRoadMatch = offRoadUseCases.some((useCase) =>
          vehicleUseCases.includes(useCase)
        );
        if (!hasOffRoadMatch) return false;
      } else if (offRoadUseCases.length === 1) {
        if (!vehicleUseCases.includes(offRoadUseCases[0])) return false;
      }

      // Check other use cases with AND logic
      const hasOtherUseCases = otherUseCases.every((useCase) =>
        vehicleUseCases.includes(useCase)
      );
      if (!hasOtherUseCases) return false;
    }

    // Body type filter - vehicle must match at least ONE body type
    if (bodyTypeFilter && bodyTypeFilter.length > 0) {
      const vehicleBodyType = vehicle.carexpert_body_type;

      if (!bodyTypeFilter.includes(vehicleBodyType)) {
        return false;
      }
    }

    // Fuel type filter - vehicle must match at least ONE fuel type
    if (fuelTypeFilter && fuelTypeFilter.length > 0) {
      const vehicleFuelType = vehicle.carexpert_fuel_type;

      if (!fuelTypeFilter.includes(vehicleFuelType)) {
        return false;
      }
    }

    return true;
  });

  // Extract vehicle IDs (UIDs) for vector database filtering
  const vehicleIds = matchingVehicles.map((vehicle) => vehicle.uid);

  const result = {
    matchCount: matchingVehicles.length,
    vehicleIds: vehicleIds,
  };

  console.log("✅ JATO SCAN COMPLETE");
  console.log(`📈 Found ${result.matchCount} matching vehicles`);
  console.log("🆔 Sample vehicle IDs:", vehicleIds.slice(0, 5));

  return result;
};

/**
 * Validate JATO filters before scanning
 * @param {Object} jatoFilters - Filter criteria to validate
 * @returns {Object} - {isValid: boolean, errors: string[]}
 */
export const validateScanFilters = (jatoFilters) => {
  const errors = [];

  if (!jatoFilters) {
    errors.push("No filters provided");
    return { isValid: false, errors };
  }

  // Budget validation
  if (
    !jatoFilters.budgetFilter ||
    typeof jatoFilters.budgetFilter.min !== "number" ||
    typeof jatoFilters.budgetFilter.max !== "number"
  ) {
    errors.push("Invalid budget filter");
  }

  // Use case validation
  if (!jatoFilters.useCaseFilter || !Array.isArray(jatoFilters.useCaseFilter)) {
    errors.push("Invalid use case filter");
  }

  // Body type validation
  if (
    !jatoFilters.bodyTypeFilter ||
    !Array.isArray(jatoFilters.bodyTypeFilter)
  ) {
    errors.push("Invalid body type filter");
  }

  // Fuel type validation
  if (
    !jatoFilters.fuelTypeFilter ||
    !Array.isArray(jatoFilters.fuelTypeFilter)
  ) {
    errors.push("Invalid fuel type filter");
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    console.warn("🚨 JATO FILTER VALIDATION FAILED:", errors);
  }

  return { isValid, errors };
};

/**
 * Get user-friendly error message for no matches
 * @param {Object} jatoFilters - Filter criteria that found no matches
 * @returns {string} - Helpful error message with suggestions
 */
export const getNoMatchesMessage = (jatoFilters) => {
  const { budgetFilter, useCaseFilter, bodyTypeFilter, fuelTypeFilter } =
    jatoFilters;

  // Format budget for user display
  let budgetText = "your budget";
  if (budgetFilter.min === 0 && budgetFilter.max < 999999) {
    budgetText = `under $${Math.round(budgetFilter.max / 1000)}k`;
  } else if (budgetFilter.min > 0 && budgetFilter.max === 999999) {
    budgetText = `over $${Math.round(budgetFilter.min / 1000)}k`;
  } else if (budgetFilter.min > 0 && budgetFilter.max < 999999) {
    budgetText = `$${Math.round(budgetFilter.min / 1000)}k-$${Math.round(
      budgetFilter.max / 1000
    )}k`;
  }

  // Format arrays for display
  const bodyTypes = bodyTypeFilter.join(" or ");
  const fuelTypes = fuelTypeFilter.join(" or ");
  const useCases = useCaseFilter
    .map((uc) => uc.toLowerCase().replace(/_/g, " "))
    .join(", ");

  const criteria = `${bodyTypes} with ${fuelTypes} fuel, ${budgetText} budget, for ${useCases}`;

  return `Sorry, I couldn't find any vehicles matching: ${criteria}. 

Try adjusting:
• Budget range (expand your price range)
• Body type (consider similar options like wagon instead of SUV)
• Fuel type (add more fuel options)
• Use cases (reduce specific requirements)

Would you like to modify your search criteria?`;
};

/**
 * Get database statistics for debugging
 * @returns {Object} - Database composition stats
 */
export const getDatabaseStats = () => {
  const stats = {
    totalVehicles: vehicleDatabase.length,
    bodyTypes: {},
    fuelTypes: {},
    priceRanges: {
      under30k: 0,
      "30k-50k": 0,
      "50k-70k": 0,
      "70k-100k": 0,
      over100k: 0,
    },
  };

  vehicleDatabase.forEach((vehicle) => {
    // Count body types
    const bodyType = vehicle.carexpert_body_type;
    stats.bodyTypes[bodyType] = (stats.bodyTypes[bodyType] || 0) + 1;

    // Count fuel types
    const fuelType = vehicle.carexpert_fuel_type;
    stats.fuelTypes[fuelType] = (stats.fuelTypes[fuelType] || 0) + 1;

    // Count price ranges
    const price = parseFloat(vehicle.retail_price);
    if (price && price > 0) {
      if (price < 30000) stats.priceRanges.under30k++;
      else if (price < 50000) stats.priceRanges["30k-50k"]++;
      else if (price < 70000) stats.priceRanges["50k-70k"]++;
      else if (price < 100000) stats.priceRanges["70k-100k"]++;
      else stats.priceRanges.over100k++;
    }
  });

  return stats;
};
