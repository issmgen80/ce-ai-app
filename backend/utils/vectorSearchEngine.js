// backend/utils/vectorSearchEngine.js
const OpenAI = require("openai");
const { Pool } = require("pg");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize PostgreSQL connection pool
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway.app")
    ? {
        rejectUnauthorized: false,
      }
    : false,
});

class VehicleSearch {
  constructor() {
    this.pool = pgPool;
  }

  async init() {
    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query("SELECT NOW()");
      client.release();
      console.log("🔌 Connected to PostgreSQL vector database");
    } catch (error) {
      console.error("❌ PostgreSQL connection failed:", error);
      throw error;
    }
  }

  async searchFilteredVehicles(searchQuery, preFilteredVehicleIds, limit = 5) {
    console.log(`🔍 Vector search: "${searchQuery}"`);
    console.log(`🎯 Pre-filtered vehicles: ${preFilteredVehicleIds.length}`);

    if (!preFilteredVehicleIds || preFilteredVehicleIds.length === 0) {
      console.log("⚠️ No pre-filtered vehicles provided");
      return [];
    }

    try {
      // Step 1: Get query embedding
      const queryResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: [searchQuery],
      });
      const queryEmbedding = queryResponse.data[0].embedding;

      // Step 2: PostgreSQL vector similarity search with proper parameterization
      console.log("🔍 Searching PostgreSQL vector database...");

      const query = `
        SELECT 
          chunk_id,
          vehicle_id,
          category,
          chunk_type,
          content,
          1 - (embedding <=> $1::vector) as similarity
        FROM vehicle_chunks 
        WHERE vehicle_id = ANY($2)
          AND 1 - (embedding <=> $1::vector) > 0.38
        ORDER BY embedding <=> $1::vector 
        LIMIT 1000;
      `;

      const queryParams = [
        `[${queryEmbedding.join(",")}]`,
        preFilteredVehicleIds,
      ];

      const result = await this.pool.query(query, queryParams);
      const relevantChunks = result.rows;

      console.log(
        `Found ${relevantChunks.length} relevant chunks with similarity > 0.38`
      );

      if (relevantChunks.length === 0) {
        console.log("⚠️ No relevant chunks found for pre-filtered vehicles");
        return [];
      }

      // Step 3: Group chunks by vehicle
      const vehicleGroups = {};
      relevantChunks.forEach((chunk) => {
        const vehicleId = chunk.vehicle_id;
        if (!vehicleGroups[vehicleId]) {
          vehicleGroups[vehicleId] = [];
        }
        vehicleGroups[vehicleId].push(chunk);
      });

      const vehicleIds = Object.keys(vehicleGroups);
      console.log(
        `Found ${vehicleIds.length} unique vehicles with matching chunks`
      );

      // Step 4: Get identity chunks for these vehicles
      const identityChunks = await this.getIdentityChunks(vehicleIds);

      // Step: Variant deduplication - keep best variant per make/model
      console.log("🔄 Deduplicating variants by make/model...");

      const makeModelGroups = {};
      vehicleIds.forEach((vehicleId) => {
        const identity = identityChunks.find(
          (id) => id.vehicle_id === vehicleId
        );
        if (!identity) return;

        // Parse make/model from identity content
        const identityMatch = identity.content.match(/^([^,]+),\s*([^,]+),/);
        if (!identityMatch) return;

        const make = identityMatch[1].trim();
        const model = identityMatch[2].trim();
        const makeModel = `${make}_${model}`;

        if (!makeModelGroups[makeModel]) {
          makeModelGroups[makeModel] = [];
        }

        // Calculate average similarity for this vehicle's relevant chunks
        const vehicleChunks = vehicleGroups[vehicleId] || [];
        const avgSimilarity =
          vehicleChunks.length > 0
            ? vehicleChunks.reduce(
                (sum, chunk) => sum + parseFloat(chunk.similarity),
                0
              ) / vehicleChunks.length
            : 0;

        makeModelGroups[makeModel].push({
          vehicleId,
          identity,
          avgSimilarity,
          chunkCount: vehicleChunks.length,
        });
      });

      // Keep only the best variant per make/model
      const deduplicatedVehicleIds = [];
      Object.entries(makeModelGroups).forEach(([makeModel, variants]) => {
        // Sort by average similarity descending, keep the best
        const bestVariant = variants.sort(
          (a, b) => b.avgSimilarity - a.avgSimilarity
        )[0];
        deduplicatedVehicleIds.push(bestVariant.vehicleId);

        console.log(
          `📊 ${makeModel}: ${variants.length} variants → kept best (ID: ${
            bestVariant.vehicleId
          }, avg: ${bestVariant.avgSimilarity.toFixed(3)})`
        );
      });

      console.log(
        `✅ Deduplication: ${vehicleIds.length} vehicles → ${deduplicatedVehicleIds.length} unique models`
      );

      // Update vehicleIds array for subsequent processing
      const originalVehicleIds = vehicleIds.slice();
      vehicleIds.length = 0;
      vehicleIds.push(...deduplicatedVehicleIds);

      // Step 5: Create results for each vehicle
      const allResults = vehicleIds
        .map((vehicleId) => {
          const chunks = vehicleGroups[vehicleId];

          // Filter chunks: always include essential categories + similarity >0.38 for others
          const essentialCategories = [
            "feature_vehicle_identity",
            "calc_physical_dimensions",
            "calc_weight_limits",
            "feature_powertrain_performance",
          ];

          const relevantChunks = chunks.filter(
            (chunk) => essentialCategories.includes(chunk.category) || true // All other chunks already passed PostgreSQL 0.38 filter
          );

          if (relevantChunks.length === 0) return null;

          const identity = identityChunks.find(
            (id) => id.vehicle_id === vehicleId
          );
          if (!identity) return null;

          const makeMatch = identity.content.match(/Vehicle: ([^\.]+)\./);
          const make = makeMatch ? makeMatch[1].split(" ")[0] : "Unknown";

          return {
            vehicleId,
            make,
            avgSimilarity:
              relevantChunks.reduce(
                (sum, c) => sum + parseFloat(c.similarity),
                0
              ) / relevantChunks.length,
            maxSimilarity: Math.max(
              ...relevantChunks.map((c) => parseFloat(c.similarity))
            ),
            relevantChunkCount: relevantChunks.length,
            identityContent: identity.content,
            relevantChunks: relevantChunks
              .map((c) => ({
                category: c.category,
                content: c.content,
                similarity: parseFloat(c.similarity),
              }))
              .sort((a, b) => b.similarity - a.similarity),
          };
        })
        .filter(Boolean);

      console.log(
        `✅ Found ${allResults.length} vehicles with complete chunk data`
      );

      // Step 6: Return top vehicles sorted by similarity
      const topVehiclesForAnalysis = allResults
        .sort((a, b) => b.maxSimilarity - a.maxSimilarity)
        .slice(0, 30);

      console.log(
        `Limited to top ${topVehiclesForAnalysis.length} vehicles for Claude analysis`
      );

      return topVehiclesForAnalysis;
    } catch (error) {
      console.error("🚨 PostgreSQL vector search error:", error);
      throw error;
    }
  }

  async getIdentityChunks(vehicleIds) {
    if (vehicleIds.length === 0) {
      return [];
    }

    try {
      const query = `
        SELECT chunk_id, vehicle_id, content 
        FROM vehicle_chunks 
        WHERE vehicle_id = ANY($1)
          AND category = 'feature_vehicle_identity'
      `;

      const result = await this.pool.query(query, [vehicleIds]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error fetching identity chunks:", error);
      return [];
    }
  }

  async close() {
    // Note: Don't close the pool in production, let it manage connections
    console.log("🔌 Vector search complete");
  }
}

// Main export function for API integration
const searchVehicles = async (
  vectorRequirements,
  preFilteredVehicleIds,
  limit = 5
) => {
  const searcher = new VehicleSearch();

  try {
    await searcher.init();

    // Join vector requirements into search query
    const searchQuery = Array.isArray(vectorRequirements)
      ? vectorRequirements.join(" ")
      : vectorRequirements || "reliable family vehicle";

    const results = await searcher.searchFilteredVehicles(
      searchQuery,
      preFilteredVehicleIds,
      limit
    );

    return results;
  } catch (error) {
    console.error("🚨 Vector search error:", error);
    throw error;
  } finally {
    await searcher.close();
  }
};

module.exports = { searchVehicles };
