// server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // <-- ВАЖНО

// Env vars
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("ERROR: MONGO_URI is missing.");
  process.exit(1);
}

// MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB error:", err.message);
    process.exit(1);
  });

// Model
const itemSchema = new mongoose.Schema({
  name: String,
  description: String,
}, { timestamps: true });

const Item = mongoose.model("Item", itemSchema);

// API routes
app.get("/api/items", async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
