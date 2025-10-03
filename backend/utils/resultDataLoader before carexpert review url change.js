const fs = require("fs");
const path = require("path");
const { loadJatoDataset } = require("./jatoLoader");

/**
 * Result Data Loader
 * Takes vehicle IDs and returns complete vehicle objects with all display fields
 */
class ResultDataLoader {
  constructor() {
    this.jatoDataset = null;
    this.reviewsData = null;
  }

  async initialize() {
    try {
      console.log("📦 Initializing result data loader...");

      // Load JATO dataset

      this.jatoDataset = loadJatoDataset();

      /* const jatoPath = path.join(
        __dirname,
        "../../frontend/src/data/final-dataset-with-features.json"
      );
      const jatoData = fs.readFileSync(jatoPath, "utf8");
      this.jatoDataset = JSON.parse(jatoData); */

      console.log(
        `✅ Loaded JATO dataset: ${this.jatoDataset.length} vehicles`
      );

      // Load reviews data
      const reviewsPath = path.join(
        __dirname,
        "../data/carexpert_reviews_enhanced_matches.json"
      );
      const reviewsData = fs.readFileSync(reviewsPath, "utf8");
      this.reviewsData = JSON.parse(reviewsData);
      console.log(`✅ Loaded reviews: ${this.reviewsData.length} entries`);

      return true;
    } catch (error) {
      console.error(
        "❌ Failed to initialize result data loader:",
        error.message
      );
      throw error;
    }
  }

  extractSeats(jatoVehicle) {
    try {
      const seatingInfo = jatoVehicle.standard_equipment?.Seating || "";
      const wordToNumber = {
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
      };

      for (const [word, number] of Object.entries(wordToNumber)) {
        if (seatingInfo.toLowerCase().includes(word)) return number;
      }

      const digitMatch = seatingInfo.match(/(\d+)\+(\d+)/);
      if (digitMatch) return parseInt(digitMatch[1]) + parseInt(digitMatch[2]);

      const directMatch = seatingInfo.match(/(\d+)\s*seats?/i);
      if (directMatch) return parseInt(directMatch[1]);

      return 5;
    } catch {
      return 5;
    }
  }

  findBestReviewMatch(make, model) {
    const candidateReviews = this.reviewsData.filter(
      (review) =>
        review.make_display?.toUpperCase() === make?.toUpperCase() &&
        review.model_display?.toUpperCase() === model?.toUpperCase()
    );

    if (candidateReviews.length === 0) return null;

    return candidateReviews.sort(
      (a, b) => new Date(b.publish_date) - new Date(a.publish_date)
    )[0];
  }

  loadVehicleData(vehicleId) {
    const vehicle = this.jatoDataset.find((v) => v.uid === vehicleId);
    if (!vehicle) {
      console.log(`⚠️  Vehicle ID ${vehicleId} not found`);
      return null;
    }

    const review = this.findBestReviewMatch(
      vehicle.make_display,
      vehicle.model_display
    );

    return {
      vehicleId: vehicle.uid,
      make: vehicle.make_display,
      model: vehicle.model_display,
      variant: vehicle.specifications?.["schema_local trim level"] || "",
      bodyType: vehicle.carexpert_body_type,
      fuelType: vehicle.carexpert_fuel_type,
      seats: this.extractSeats(vehicle),
      price: parseFloat(vehicle.retail_price) || 0,
      year: vehicle.year,
      hasReview: !!review,
      reviewRating: review?.rating || null,
      reviewUrl: review?.original_url || null,
    };
  }

  async loadResults(rankedVehicleIds) {
    try {
      if (!this.jatoDataset || !this.reviewsData) {
        await this.initialize();
      }

      console.log(`\n📦 Loading data for ${rankedVehicleIds.length} vehicles`);

      const results = rankedVehicleIds
        .map((vehicleId) => this.loadVehicleData(vehicleId))
        .filter(Boolean);

      console.log(`✅ Successfully loaded ${results.length} vehicles`);

      return results;
    } catch (error) {
      console.error("❌ Result data loading failed:", error.message);
      throw error;
    }
  }
}

const resultDataLoader = new ResultDataLoader();

module.exports = {
  loadResults: (rankedVehicleIds) =>
    resultDataLoader.loadResults(rankedVehicleIds),
  ResultDataLoader,
};
