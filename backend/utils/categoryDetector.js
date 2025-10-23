// backend/utils/categoryDetector.js

const ALL_CATEGORIES = [
  "feature_vehicle_identity",
  "calc_weight_limits",
  "calc_towing_capacity",
  "calc_physical_dimensions",
  "calc_fuel_economy",
  "calc_offroad_specs",
  "feature_safety_passive",
  "feature_safety_active",
  "feature_safety_collision",
  "feature_safety_misc",
  "feature_driver_assistance",
  "feature_technology",
  "feature_electrical_systems",
  "feature_powertrain_performance",
  "feature_drivetrain_systems",
  "feature_suspension_systems",
  "feature_braking_systems",
  "feature_wheels_tires",
  "feature_comfort_interior",
  "feature_warranty_coverage",
  "feature_exterior_design",
  "feature_exterior_lights",
];

const CATEGORY_MAP = {
  // Price/Identity
  price: ["feature_vehicle_identity"],
  cost: ["feature_vehicle_identity"],
  msrp: ["feature_vehicle_identity"],
  retail: ["feature_vehicle_identity"],

  // Performance & Fuel
  "fuel economy": ["calc_fuel_economy", "feature_vehicle_identity"],
  "fuel consumption": ["calc_fuel_economy", "feature_vehicle_identity"],
  mpg: ["calc_fuel_economy"],
  "litres per 100km": ["calc_fuel_economy"],
  range: ["calc_fuel_economy"],
  tank: ["calc_fuel_economy"],

  // Towing & Weight
  towing: [
    "calc_towing_capacity",
    "calc_weight_limits",
    "feature_vehicle_identity",
  ],
  tow: ["calc_towing_capacity", "calc_weight_limits"],
  payload: ["calc_weight_limits", "feature_vehicle_identity"],
  gvm: ["calc_weight_limits"],
  gcm: ["calc_weight_limits"],
  weight: ["calc_weight_limits"],
  "kerb weight": ["calc_weight_limits"],

  // Safety
  safety: [
    "feature_safety_passive",
    "feature_safety_active",
    "feature_safety_collision",
    "feature_vehicle_identity",
  ],
  ancap: ["feature_safety_passive", "feature_vehicle_identity"],
  airbag: ["feature_safety_passive"],
  collision: ["feature_safety_collision"],
  crash: ["feature_safety_passive", "feature_safety_collision"],
  abs: ["feature_safety_active"],
  "stability control": ["feature_safety_active"],

  // Dimensions
  size: ["calc_physical_dimensions", "feature_vehicle_identity"],
  dimension: ["calc_physical_dimensions", "feature_vehicle_identity"],
  length: ["calc_physical_dimensions"],
  width: ["calc_physical_dimensions"],
  height: ["calc_physical_dimensions"],
  "ground clearance": ["calc_offroad_specs", "calc_physical_dimensions"],

  // Interior & Comfort
  seats: ["feature_comfort_interior", "feature_vehicle_identity"],
  seating: ["feature_comfort_interior", "feature_vehicle_identity"],
  interior: ["feature_comfort_interior", "feature_vehicle_identity"],
  comfort: ["feature_comfort_interior"],
  "air conditioning": ["feature_comfort_interior"],
  climate: ["feature_comfort_interior"],

  // Technology & Features
  features: [
    "feature_technology",
    "feature_comfort_interior",
    "feature_driver_assistance",
    "feature_vehicle_identity",
  ],
  technology: ["feature_technology", "feature_vehicle_identity"],
  infotainment: ["feature_technology"],
  screen: ["feature_technology"],
  "apple carplay": ["feature_technology"],
  "android auto": ["feature_technology"],
  bluetooth: ["feature_technology"],

  // Driver Assistance
  "cruise control": ["feature_driver_assistance"],
  "adaptive cruise": ["feature_driver_assistance"],
  parking: ["feature_driver_assistance"],
  camera: ["feature_driver_assistance"],
  sensor: ["feature_driver_assistance"],

  // Powertrain
  engine: ["feature_powertrain_performance", "feature_vehicle_identity"],
  power: ["feature_powertrain_performance", "feature_vehicle_identity"],
  torque: ["feature_powertrain_performance"],
  horsepower: ["feature_powertrain_performance"],
  kw: ["feature_powertrain_performance"],
  acceleration: ["feature_powertrain_performance"],
  performance: ["feature_powertrain_performance", "feature_vehicle_identity"],

  // Drivetrain
  drivetrain: ["feature_drivetrain_systems", "feature_vehicle_identity"],
  transmission: ["feature_drivetrain_systems", "feature_vehicle_identity"],
  awd: ["feature_drivetrain_systems", "feature_vehicle_identity"],
  "4wd": ["feature_drivetrain_systems", "feature_vehicle_identity"],
  "four wheel drive": [
    "feature_drivetrain_systems",
    "feature_vehicle_identity",
  ],

  // Wheels & Tires
  wheels: ["feature_wheels_tires", "feature_vehicle_identity"],
  tires: ["feature_wheels_tires", "feature_vehicle_identity"],
  tyres: ["feature_wheels_tires", "feature_vehicle_identity"],
  rims: ["feature_wheels_tires"],

  // Warranty
  warranty: ["feature_warranty_coverage", "feature_vehicle_identity"],

  // Exterior
  lights: ["feature_exterior_lights", "feature_vehicle_identity"],
  headlights: ["feature_exterior_lights"],
  led: ["feature_exterior_lights"],

  // Cargo & Storage
  boot: [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  "boot space": [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  cargo: [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  "cargo space": [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  storage: [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  trunk: [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  tray: [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  "tray size": [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  bed: [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  "bed size": [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  tub: [
    "calc_cargo_capacity",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],

  // Off-road
  "off-road": [
    "calc_offroad_specs",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
  offroad: [
    "calc_offroad_specs",
    "calc_physical_dimensions",
    "feature_vehicle_identity",
  ],
};

/**
 * Detect relevant categories from user question
 * @param {string} question - User's question
 * @returns {Array} - Array of category strings
 */
function detectCategories(question) {
  const lowerQuestion = question.toLowerCase();

  // Check for broad questions that need all categories
  const broadTerms = [
    "tell me about",
    "what is",
    "information about",
    "details about",
    "specs for",
  ];
  const isBroadQuestion = broadTerms.some((term) =>
    lowerQuestion.includes(term)
  );

  if (isBroadQuestion) {
    console.log("📋 Broad question detected - using all categories");
    return ALL_CATEGORIES;
  }

  // Find matching categories
  let matchedCategories = new Set();

  for (const [keyword, categories] of Object.entries(CATEGORY_MAP)) {
    if (lowerQuestion.includes(keyword)) {
      categories.forEach((cat) => matchedCategories.add(cat));
      console.log(
        `🎯 Keyword "${keyword}" matched → ${categories.length} categories`
      );
    }
  }

  // Always include identity for context
  matchedCategories.add("feature_vehicle_identity");
  matchedCategories.add("feature_drivetrain_systems");
  matchedCategories.add("calc_weight_limits");
  matchedCategories.add("feature_powertrain_performance");
  matchedCategories.add("feature_fuel_specifications");

  const finalCategories = Array.from(matchedCategories);

  // If no specific matches found, use common categories
  if (finalCategories.length === 2) {
    // Changed from 1 to 2 (identity + drivetrain)
    console.log("⚠️  No specific categories detected - using common set");
    return [
      "feature_vehicle_identity",
      "feature_drivetrain_systems",
      "calc_physical_dimensions",
      "calc_weight_limits",
      "calc_fuel_economy",
      "feature_powertrain_performance",
      "feature_safety_passive",
      "feature_fuel_specifications",
    ];
  }

  console.log(`✅ Detected ${finalCategories.length} relevant categories`);
  return finalCategories;
}

module.exports = { detectCategories };
