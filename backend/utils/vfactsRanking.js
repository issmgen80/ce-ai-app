const fs = require("fs");
const path = require("path");
const { loadJatoDataset } = require("./jatoLoader");

/**
 * VFACTS Ranking System
 * Takes vehicle IDs and reorders them by Australian sales popularity
 */
class VFACTSRanker {
  constructor() {
    this.vfactsLookup = null;
    this.jatoDataset = null;
  }

  async initialize() {
    try {
      console.log("📄 Initializing VFACTS ranker...");

      const lookupPath = path.join(__dirname, "../data/vfacts-lookup.json");
      const lookupData = fs.readFileSync(lookupPath, "utf8");
      this.vfactsLookup = JSON.parse(lookupData);
      console.log(
        `✅ Loaded VFACTS lookup: ${
          Object.keys(this.vfactsLookup).length
        } entries`
      );

      // Need JATO dataset to get make/model for normalization
      this.jatoDataset = loadJatoDataset();
      /*

      const jatoPath = path.join(
        __dirname,
        "../../frontend/src/data/final-dataset-with-features.json"
      );
      const jatoData = fs.readFileSync(jatoPath, "utf8");
      this.jatoDataset = JSON.parse(jatoData); */

      console.log(
        `✅ Loaded JATO dataset: ${this.jatoDataset.length} vehicles`
      );

      return true;
    } catch (error) {
      console.error("❌ Failed to initialize VFACTS ranker:", error.message);
      throw error;
    }
  }

  normalizeKey(make, model) {
    if (!make || !model) return null;
    return `${make.toLowerCase()}_${model.toLowerCase()}`
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  async rankByVFACTS(claudeResults) {
    try {
      if (!this.vfactsLookup || !this.jatoDataset) {
        await this.initialize();
      }

      console.log("\n🏆 VFACTS RANKING PROCESS");
      console.log("=".repeat(50));

      if (
        !claudeResults.rankedVehicles ||
        claudeResults.rankedVehicles.length === 0
      ) {
        console.log("❌ No vehicles to rank");
        return { rankedVehicleIds: [] };
      }

      // Get sales volume for each vehicle
      const vehiclesWithSales = claudeResults.rankedVehicles.map(
        (vehicle, index) => {
          const jatoVehicle = this.jatoDataset.find(
            (v) => v.uid === vehicle.vehicleId
          );
          if (!jatoVehicle) {
            console.log(`⚠️  Vehicle ${vehicle.vehicleId} not found in JATO`);
            return { ...vehicle, salesVolume: 0, originalRank: index + 1 };
          }

          const normalizedKey = this.normalizeKey(
            jatoVehicle.make_display,
            jatoVehicle.model_display
          );
          const salesVolume = this.vfactsLookup[normalizedKey] || 0;

          console.log(
            `${index + 1}. ${jatoVehicle.make_display} ${
              jatoVehicle.model_display
            }: ${salesVolume.toLocaleString()} sales`
          );

          return {
            ...vehicle,
            salesVolume,
            originalRank: index + 1,
          };
        }
      );

      // Sort by sales volume (highest first)
      const sorted = vehiclesWithSales.sort(
        (a, b) => b.salesVolume - a.salesVolume
      );

      console.log("\n🥇 VFACTS RANKING RESULTS:");
      sorted.forEach((vehicle, index) => {
        const rankChange = vehicle.originalRank - (index + 1);
        const indicator =
          rankChange > 0
            ? `↗️ +${rankChange}`
            : rankChange < 0
            ? `↘️ ${rankChange}`
            : "➡️ same";
        console.log(
          `${
            index + 1
          }. Sales: ${vehicle.salesVolume.toLocaleString()} | ${indicator}`
        );
      });

      // Return top 5 vehicle IDs with their metadata
      const top5 = sorted.slice(0, 5);
      console.log(
        `\n✅ Returning top ${top5.length} vehicles by sales popularity`
      );

      return {
        rankedVehicleIds: top5.map((v) => v.vehicleId), // Just the ID string, not the whole object
        metadata: top5.map((v) => ({
          vehicleId: v.vehicleId,
          matchConfidence: v.matchConfidence,
          reasoning: v.reasoning,
          salesVolume: v.salesVolume,
        })),
      };
    } catch (error) {
      console.error("❌ VFACTS ranking failed:", error.message);
      return { rankedVehicleIds: [] };
    }
  }
}

const vfactsRanker = new VFACTSRanker();

module.exports = {
  rankByVFACTS: (claudeResults) => vfactsRanker.rankByVFACTS(claudeResults),
  VFACTSRanker,
};
