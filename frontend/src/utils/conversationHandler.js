// frontend/src/utils/conversationHandler.js - SECURE VERSION
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * SINGLE conversation handler - calls backend instead of Claude directly
 * @param {Array} conversationHistory - Full message history
 * @returns {Object} - { type: 'conversation' | 'search', message?: string, criteria?: Object }
 */
export const handleConversation = async (conversationHistory) => {
  try {
    console.log(
      "Sending to backend, message count:",
      conversationHistory.length
    );

    const response = await fetch(`${API_URL}/api/conversation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      if (response.status === 429) {
        throw new Error("Rate limited. Please wait a moment and try again.");
      }

      throw new Error(errorData.error || "Connection error. Please try again.");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Request failed");
    }

    console.log("Backend response type:", data.type);

    // Backend returns same structure as before
    if (data.type === "search") {
      return {
        type: "search",
        criteria: data.criteria,
        message: data.message,
      };
    }

    // Conversation response
    return {
      type: "conversation",
      message: data.message,
    };
  } catch (error) {
    console.error("Conversation API error:", error);
    throw error;
  }
};
