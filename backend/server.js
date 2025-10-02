// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const vectorSearchRoutes = require("./routes/vectorSearch");
console.log("Loading conversation routes...");
const conversationRoutes = require("./routes/conversation");
console.log("Conversation routes loaded successfully");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend server running" });
});

// Vector search routes
app.use("/api", vectorSearchRoutes);
app.use("/api", conversationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Vector search: http://localhost:${PORT}/api/vector-search`);
});

module.exports = app;
