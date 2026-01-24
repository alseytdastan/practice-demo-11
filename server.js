// server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ----- Middlewares -----
app.use(cors());
app.use(express.json()); // all requests/responses JSON

// ----- Env vars -----
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI is missing. Add it to .env or hosting env vars.");
  process.exit(1);
}

// ----- MongoDB connect -----
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ----- Mongoose Model -----
const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);

// ----- Routes -----

// GET /
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "API is running",
    endpoints: {
      list: "GET /api/items",
      getById: "GET /api/items/:id",
      create: "POST /api/items",
      update: "PUT /api/items/:id",
      delete: "DELETE /api/items/:id",
    },
  });
});

// GET /api/items
app.get("/api/items", async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json({ status: "ok", count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /api/items/:id
app.get("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ status: "error", message: "Item not found" });
    }

    res.json({ status: "ok", data: item });
  } catch (err) {
    // invalid ObjectId
    if (err.name === "CastError") {
      return res.status(400).json({ status: "error", message: "Invalid item id" });
    }
    res.status(500).json({ status: "error", message: err.message });
  }
});

// POST /api/items
app.post("/api/items", async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "name is required" });
    }

    const newItem = await Item.create({
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
    });

    res.status(201).json({ status: "ok", message: "Item created", data: newItem });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// PUT /api/items/:id
app.put("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const update = {};
    if (typeof name === "string") update.name = name.trim();
    if (typeof description === "string") update.description = description.trim();

    const updatedItem = await Item.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedItem) {
      return res.status(404).json({ status: "error", message: "Item not found" });
    }

    res.json({ status: "ok", message: "Item updated", data: updatedItem });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ status: "error", message: "Invalid item id" });
    }
    res.status(500).json({ status: "error", message: err.message });
  }
});

// DELETE /api/items/:id
app.delete("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Item.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ status: "error", message: "Item not found" });
    }

    res.json({ status: "ok", message: "Item deleted", data: deleted });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ status: "error", message: "Invalid item id" });
    }
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ----- 404 JSON -----
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

// ----- Start server -----
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
