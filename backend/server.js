// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const vectorSearchRoutes = require("./routes/vectorSearch");
const prefilterRoutes = require("./routes/prefilter");
console.log("Loading conversation routes...");
const conversationRoutes = require("./routes/conversation");
console.log("Conversation routes loaded successfully");
const dataLookupRoutes = require("./routes/dataLookup");
console.log("Data lookup routes loaded successfully");

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiters for different endpoints
const conversationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    success: false,
    error: "Too many messages. Please wait a moment before sending another.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const dataLookupLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 lookups per minute
  message: {
    success: false,
    error: "Too many searches. Please wait a moment before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 searches per minute
  message: {
    success: false,
    error: "Too many searches. Please wait a moment before searching again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend server running" });
});

// Routes with rate limiting
app.use("/api/conversation", conversationLimiter);
app.use("/api/data-lookup", dataLookupLimiter);
app.use("/api/vector-search", searchLimiter);

app.use("/api", vectorSearchRoutes);
app.use("/api", conversationRoutes);
app.use("/api", prefilterRoutes);
app.use("/api", dataLookupRoutes);

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
  console.log(`🔍 Pre-filter: http://localhost:${PORT}/api/prefilter`);
});

module.exports = app;
