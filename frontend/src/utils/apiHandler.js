const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Unified API call handler with proper error handling
 */
const handleApiCall = async (endpoint, body) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();

      // Handle rate limiting (429)
      if (response.status === 429) {
        throw new Error(
          errorData.error ||
            "Too many requests. Please wait a moment and try again."
        );
      }

      // Handle other errors
      throw new Error(errorData.error || "Request failed. Please try again.");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  } catch (error) {
    console.error(`API error (${endpoint}):`, error);
    throw error;
  }
};

/**
 * Conversation API
 */
export const handleConversation = async (conversationHistory) => {
  return handleApiCall("/api/conversation", { conversationHistory });
};

/**
 * Data Lookup API
 */
export const handleDataLookup = async (vehicleQuery, vehicleName) => {
  return handleApiCall("/api/data-lookup", { vehicleQuery, vehicleName });
};

/**
 * Pre-filter API
 */
export const handlePrefilter = async (
  budget,
  useCase,
  bodyType,
  fuelType,
  vectorRequirements
) => {
  return handleApiCall("/api/prefilter", {
    budget,
    useCase,
    bodyType,
    fuelType,
    vectorRequirements,
  });
};

/**
 * Vector Search API
 */
export const handleVectorSearch = async (vectorRequirements, vehicleIds) => {
  return handleApiCall("/api/vector-search", {
    vectorRequirements,
    vehicleIds,
  });
};
