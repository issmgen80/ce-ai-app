// utils/jatoConverter.js
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

const makeRequestWithRetry = async (apiCall, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (
        (error.status === 429 || error.status === 529) &&
        attempt < maxRetries
      ) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }
      throw error;
    }
  }
};

// Converts natural language conversationSummary to exact JATO database labels

/**
 * Use Claude to classify unknown use cases as fallback
 */
const classifyUnknownUseCases = async (unknownUseCases) => {
  if (!unknownUseCases || unknownUseCases.length === 0) return [];

  try {
    const response = await makeRequestWithRetry(() =>
      anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: `These vehicle use cases don't match our predefined categories. Classify them:

Unknown use cases: ${unknownUseCases.join(", ")}

JATO categories (ONLY these 4 clarification types):
- FAMILY_LIFE_5SEAT: 5 seats, couples, small families
- FAMILY_LIFE_6PLUS: 6+ seats, large families, multiple kids
- TOWING_LIGHT: boats, small trailers (under 3000kg)
- TOWING_HEAVY: caravans, large trailers (over 3000kg)
- OFFROAD_LIGHT: camping, beach, gravel roads
- OFFROAD_HEAVY: rock crawling, serious 4WD tracks
- UTE_LIFESTYLE: lifestyle dual cab utes with factory tub
- UTE_CHASSIS: commercial cab chassis utes with tray

If the use case doesn't match these 8 categories, return empty array [].

Return only JSON array: ["CATEGORY1", "CATEGORY2"] or []`,
          },
        ],
      })
    );

    const cleanedResponse = response.content[0].text
      .trim()
      .replace(/```json|```/g, "");
    const categories = JSON.parse(cleanedResponse);

    console.log(`Claude classified unknown use cases:`, {
      input: unknownUseCases,
      output: categories,
    });
    return Array.isArray(categories) ? categories : [];
  } catch (error) {
    console.warn("Claude classification failed:", error);
    return [];
  }
};

/**
 * Convert budget string to min/max price range
 * @param {string} budgetString - Natural language budget
 * @returns {Object} - {min: number, max: number}
 */
const convertBudget = (budgetString) => {
  if (!budgetString) return { min: 0, max: 999999 };

  const budget = budgetString.toLowerCase().trim();

  // Simple ranges
  const underMatch = budget.match(/^(under|up to|below|less than)\s*(\d+)k?$/);
  if (underMatch) {
    return { min: 0, max: parseInt(underMatch[2]) * 1000 };
  }

  const overMatch = budget.match(/^(over|above|more than)\s*(\d+)k?\+?$/);
  if (overMatch) {
    return { min: parseInt(overMatch[2]) * 1000, max: 999999 };
  }

  // "Around" ranges (-20%/+10% rule)
  const aroundMatch = budget.match(/^(around|about|approximately)\s*(\d+)k?$/);
  if (aroundMatch) {
    const base = parseInt(aroundMatch[2]) * 1000;
    return {
      min: Math.floor(base * 0.8), // -20%
      max: Math.floor(base * 1.1), // +10%
    };
  }

  // Explicit ranges
  const rangeMatch = budget.match(/^(\d+)k?\s*[-to]\s*(\d+)k?\s*(range)?$/);
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1]) * 1000,
      max: parseInt(rangeMatch[2]) * 1000,
    };
  }

  // Max ranges
  const maxMatch = budget.match(/^(\d+)k?\s*max$/);
  if (maxMatch) {
    return { min: 0, max: parseInt(maxMatch[1]) * 1000 };
  }

  // Vague terms
  const vagueMappings = {
    cheap: { min: 0, max: 35000 },
    budget: { min: 0, max: 35000 },
    affordable: { min: 0, max: 35000 },
    "mid-range": { min: 35000, max: 70000 },
    moderate: { min: 35000, max: 70000 },
    expensive: { min: 70000, max: 999999 },
    "luxury budget": { min: 70000, max: 999999 },
    "high-end": { min: 70000, max: 999999 },
    flexible: { min: 0, max: 999999 },
    "open budget": { min: 0, max: 999999 },
  };

  if (vagueMappings[budget]) {
    return vagueMappings[budget];
  }

  console.warn(`Unknown budget format: "${budgetString}", using fallback`);
  return { min: 0, max: 999999 };
};

/**
 * Convert use case strings to JATO labels
 * @param {Array} useCaseArray - Array of natural language use cases
 * @returns {Object} - {jatoUseCases: Array, vectorRequirements: Array}
 */
const convertUseCases = async (useCaseArray) => {
  if (!useCaseArray || useCaseArray.length === 0) {
    return { jatoUseCases: [], vectorRequirements: [] }; // Empty, not defaulted
  }

  const jatoUseCases = new Set();
  const vectorRequirements = new Set();
  const unknownUseCases = []; // Track terms that don't match

  // 🔧 Smart detection: Check if specific labels exist
  const hasHeavyTowing = useCaseArray.some((uc) =>
    uc.toLowerCase().includes("heavy towing")
  );
  const hasLightTowing = useCaseArray.some((uc) =>
    uc.toLowerCase().includes("light towing")
  );
  const hasFamily6Plus = useCaseArray.some(
    (uc) =>
      uc.toLowerCase().includes("family 6+") ||
      uc.toLowerCase().includes("family 7")
  );
  const hasFamily5Seats = useCaseArray.some((uc) =>
    uc.toLowerCase().includes("family 5")
  );

  // Direct JATO matches - ONLY clarifications
  const directMappings = {
    "family 5 seats": ["FAMILY_LIFE_5SEAT"],
    "family 6+ seats": ["FAMILY_LIFE_6PLUS"],
    "light towing": ["TOWING_LIGHT"],
    "heavy towing": ["TOWING_HEAVY"],
    "lifestyle ute": ["UTE_LIFESTYLE"],
    "chassis ute": ["UTE_CHASSIS"],
  };

  // Smart inferences - ONLY clarifications
  const smartMappings = {
    "adventure ute": ["UTE_LIFESTYLE"],
    "cab chassis ute": ["UTE_CHASSIS"],
    "chassis configuration": ["UTE_CHASSIS"],
  };

  // Everything that's NOT a clarification goes to vectorRequirements
  const vectorOnlyTerms = new Set([
    // Original vector-only terms
    "reliable",
    "safe",
    "easy to park",
    "comfortable",
    "quiet",
    "practical",
    "tray",
    // Now also include all other use cases
    "carrying gear",
    "performance",
    "fun driving",
    "luxury",
    "workhorse",
    "highway driving",
    "trade work",
    "sports equipment",
    "dogs",
    "pets",
    "bikes",
    "bicycles",
    "city",
    "city driving",
    "commuting",
  ]);

  useCaseArray.forEach((useCase) => {
    const normalizedUseCase = useCase.toLowerCase().trim();
    let matched = false; // Track if this use case was processed

    // Check direct mappings first
    if (directMappings[normalizedUseCase]) {
      directMappings[normalizedUseCase].forEach((jato) =>
        jatoUseCases.add(jato)
      );
      matched = true;
    }
    // Skip clarification placeholders - don't process these
    else if (normalizedUseCase === "dual cab clarification needed") {
      console.log("Skipping clarification placeholder:", useCase);
      matched = true; // Mark as handled to prevent it going to unknownUseCases
    }
    // 🔧 SMART GENERIC LOGIC: Only apply defaults if specific labels DON'T exist
    else if (
      normalizedUseCase === "towing" &&
      !hasHeavyTowing &&
      !hasLightTowing
    ) {
      console.log(`Generic "towing" mapped to default: TOWING_LIGHT`);
      jatoUseCases.add("TOWING_LIGHT");
      matched = true;
    } else if (
      normalizedUseCase === "family" &&
      !hasFamily6Plus &&
      !hasFamily5Seats
    ) {
      console.log(`Generic "family" mapped to default: FAMILY_LIFE_5SEAT`);
      jatoUseCases.add("FAMILY_LIFE_5SEAT");
      matched = true;
    }
    // 🔧 Skip generic terms when specific ones exist
    else if (["towing", "off-road", "family"].includes(normalizedUseCase)) {
      console.log(`Skipping generic "${useCase}" - specific variant exists`);
      matched = true; // Mark as handled even though we're skipping
    }
    // Check smart inferences
    else if (smartMappings[normalizedUseCase]) {
      smartMappings[normalizedUseCase].forEach((jato) =>
        jatoUseCases.add(jato)
      );
      matched = true;
    }
    // Check vector-only terms
    else if (vectorOnlyTerms.has(normalizedUseCase)) {
      vectorRequirements.add(normalizedUseCase);
      matched = true;
    }
    // If nothing matched, add to unknown list for Claude classification
    if (!matched) {
      unknownUseCases.push(useCase);
    }
  });

  // Use Claude as fallback for unknown terms only
  if (unknownUseCases.length > 0) {
    const claudeClassified = await classifyUnknownUseCases(unknownUseCases);
    claudeClassified.forEach((category) => jatoUseCases.add(category));

    // Add original unknown terms to vector requirements as backup
    unknownUseCases.forEach((term) => vectorRequirements.add(term));
  }

  /* 
  // Apply fallback if no JATO use cases found
  if (jatoUseCases.size === 0) {
    console.log(
      "No JATO use cases found, applying fallback: FAMILY_LIFE_5SEAT"
    );
    jatoUseCases.add("FAMILY_LIFE_5SEAT");
  }
*/

  return {
    jatoUseCases: Array.from(jatoUseCases),
    vectorRequirements: Array.from(vectorRequirements),
  };
};

/**
 * Convert body type strings to JATO labels
 * @param {Array} bodyTypeArray - Array of natural language body types
 * @returns {Array} - Array of JATO body type labels
 */
const convertBodyTypes = (bodyTypeArray) => {
  if (!bodyTypeArray || bodyTypeArray.length === 0) {
    return ["suv"]; // Fallback
  }

  const jatoBodyTypes = new Set();

  // Direct JATO matches
  const directMappings = {
    suv: ["suv"],
    ute: ["ute"],
    sedan: ["sedan"],
    hatchback: ["hatchback"],
    wagon: ["wagon"],
    van: ["van"],
    coupe: ["coupe"],
    convertible: ["convertible"],
    "people mover": ["people_mover"],
    "light truck": ["light_truck"],
  };

  // Common alternatives
  const alternativeMappings = {
    "4wd": ["suv"],
    pickup: ["ute"],
    truck: ["ute"],
    "dual cab": ["ute"],
    "crew cab": ["ute"],
    hatch: ["hatchback"],
    "station wagon": ["wagon"],
    estate: ["wagon"],
    mpv: ["people_mover"],
    minivan: ["people_mover"],
    "soft-top": ["convertible"],
    cabriolet: ["convertible"],
    "commercial vehicle": ["van", "light_truck"],
  };

  // Size-based (smart inference)
  const sizeMappings = {
    "small car": ["hatchback", "sedan"],
    compact: ["hatchback", "sedan"],
    "mid-size": ["sedan", "suv"],
    "large car": ["sedan", "suv"],
    "family car": ["suv", "sedan", "wagon"],
  };

  bodyTypeArray.forEach((bodyType) => {
    const normalizedBodyType = bodyType.toLowerCase().trim();

    // Check direct mappings first
    if (directMappings[normalizedBodyType]) {
      directMappings[normalizedBodyType].forEach((jato) =>
        jatoBodyTypes.add(jato)
      );
    }
    // Check alternatives
    else if (alternativeMappings[normalizedBodyType]) {
      alternativeMappings[normalizedBodyType].forEach((jato) =>
        jatoBodyTypes.add(jato)
      );
    }
    // Check size-based
    else if (sizeMappings[normalizedBodyType]) {
      sizeMappings[normalizedBodyType].forEach((jato) =>
        jatoBodyTypes.add(jato)
      );
    }
    // Unknown term - log and use fallback
    else {
      console.warn(`Unknown body type: "${bodyType}", using fallback`);
      jatoBodyTypes.add("suv");
    }
  });

  // Apply fallback if no body types found
  if (jatoBodyTypes.size === 0) {
    console.log("No body types found, applying fallback: suv");
    jatoBodyTypes.add("suv");
  }

  return Array.from(jatoBodyTypes);
};

/**
 * Convert fuel type strings to JATO labels
 * @param {Array} fuelTypeArray - Array of natural language fuel types
 * @returns {Array} - Array of JATO fuel type labels
 */
const convertFuelTypes = (fuelTypeArray) => {
  if (!fuelTypeArray || fuelTypeArray.length === 0) {
    return ["petrol"]; // Fallback
  }

  const jatoFuelTypes = new Set();

  // Direct JATO matches
  const directMappings = {
    petrol: ["petrol"],
    diesel: ["diesel"],
    hybrid: ["hybrid"],
    electric: ["electric"],
    "plug-in hybrid": ["plug_in_hybrid"],
  };

  // Common alternatives
  const alternativeMappings = {
    gasoline: ["petrol"],
    gas: ["petrol"],
    ev: ["electric"],
    bev: ["electric"],
    "battery electric": ["electric"],
    phev: ["plug_in_hybrid"],
    "plug in hybrid": ["plug_in_hybrid"],
    "self-charging hybrid": ["hybrid"],
    "mild hybrid": ["hybrid"],
    "full hybrid": ["hybrid"],
  };

  // Preferences (multiple options)
  const preferenceMappings = {
    economical: ["hybrid", "electric"],
    "environmentally friendly": ["electric", "hybrid", "plug_in_hybrid"],
    eco: ["electric", "hybrid", "plug_in_hybrid"],
    "long range": ["diesel", "petrol", "hybrid"],
    "quick refueling": ["petrol", "diesel"],
    "no emissions": ["electric"],
  };

  fuelTypeArray.forEach((fuelType) => {
    const normalizedFuelType = fuelType.toLowerCase().trim();

    // Check direct mappings first
    if (directMappings[normalizedFuelType]) {
      directMappings[normalizedFuelType].forEach((jato) =>
        jatoFuelTypes.add(jato)
      );
    }
    // Check alternatives
    else if (alternativeMappings[normalizedFuelType]) {
      alternativeMappings[normalizedFuelType].forEach((jato) =>
        jatoFuelTypes.add(jato)
      );
    }
    // Check preferences
    else if (preferenceMappings[normalizedFuelType]) {
      preferenceMappings[normalizedFuelType].forEach((jato) =>
        jatoFuelTypes.add(jato)
      );
    }
    // No preference terms
    else if (
      ["any", "no preference", "whatever"].includes(normalizedFuelType)
    ) {
      jatoFuelTypes.add("petrol"); // Fallback
    }
    // Unknown term - log and use fallback
    else {
      console.warn(`Unknown fuel type: "${fuelType}", using fallback`);
      jatoFuelTypes.add("petrol");
    }
  });

  // Apply fallback if no fuel types found
  if (jatoFuelTypes.size === 0) {
    console.log("No fuel types found, applying fallback: petrol");
    jatoFuelTypes.add("petrol");
  }

  return Array.from(jatoFuelTypes);
};

/**
 * Main converter function - transforms conversationSummary to JATO filter criteria
 * @param {Object} conversationSummary - Natural language requirements
 * @returns {Object} - JATO-ready filter criteria
 */
export const convertToJatoLabels = async (conversationSummary) => {
  console.log("🔄 CONVERTING TO JATO LABELS:", conversationSummary);

  // Convert budget
  const budgetFilter = convertBudget(conversationSummary.budget);

  // Convert use cases
  const { jatoUseCases, vectorRequirements: useCaseVectorReqs } =
    await convertUseCases(conversationSummary.useCase);

  // Convert body types
  const bodyTypeFilter = convertBodyTypes(conversationSummary.bodyType);

  // Convert fuel types
  const fuelTypeFilter = convertFuelTypes(conversationSummary.fuelType);

  // Combine vector requirements
  const combinedVectorRequirements = [
    ...(conversationSummary.vectorRequirements || []),
    ...useCaseVectorReqs,
  ];

  // If vectorRequirements is empty, add bodyType for context
  if (combinedVectorRequirements.length === 0) {
    combinedVectorRequirements.push(...conversationSummary.bodyType);
  }

  const jatoFilters = {
    budgetFilter,
    useCaseFilter: jatoUseCases,
    bodyTypeFilter,
    fuelTypeFilter,
    vectorRequirements: combinedVectorRequirements,
  };

  console.log("✅ JATO CONVERSION COMPLETE:", jatoFilters);

  return jatoFilters;
};

/**
 * Validation function - checks if conversion was successful
 * @param {Object} jatoFilters - Converted JATO filters
 * @returns {boolean} - True if valid for pre-filtering
 */
export const validateJatoFilters = (jatoFilters) => {
  const hasValidBudget =
    jatoFilters.budgetFilter &&
    typeof jatoFilters.budgetFilter.min === "number" &&
    typeof jatoFilters.budgetFilter.max === "number";

  const hasUseCases =
    jatoFilters.useCaseFilter && Array.isArray(jatoFilters.useCaseFilter);
  const hasBodyTypes =
    jatoFilters.bodyTypeFilter && jatoFilters.bodyTypeFilter.length > 0;
  const hasFuelTypes =
    jatoFilters.fuelTypeFilter && jatoFilters.fuelTypeFilter.length > 0;

  const isValid = hasValidBudget && hasUseCases && hasBodyTypes && hasFuelTypes;

  console.log("🔍 JATO FILTER VALIDATION:", {
    hasValidBudget,
    hasUseCases,
    hasBodyTypes,
    hasFuelTypes,
    isValid,
  });

  return isValid;
};
