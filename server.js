require("dotenv").config();

const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Env vars
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const API_KEY = process.env.API_KEY;

if (!MONGO_URI) {
  console.error("ERROR: MONGO_URI is missing. Add it to .env or hosting env vars.");
  process.exit(1);
}

if (!API_KEY) {
  console.error("ERROR: API_KEY is missing. Add it to .env");
  process.exit(1);
}

// MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

// Model
const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);

// API Key Middleware
function requireApiKey(req, res, next) {
  try {
    const key = req.header("x-api-key");

    if (!key) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    if (key !== API_KEY) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
}
// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API info
app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    message: "API is running",
    endpoints: {
      list: "GET /api/items",
      getById: "GET /api/items/:id",
      create: "POST /api/items",
      update: "PUT /api/items/:id",
      patch: "PATCH /api/items/:id",
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
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// GET /api/items/:id
app.get("/api/items/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ status: "error", message: "Item not found" });
    }
    res.json({ status: "ok", data: item });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ status: "error", message: "Invalid item id" });
    }
    res.status(500).json({ status: "error", message: "Server error" });
  }
});


// POST (protected)
app.post("/api/items", requireApiKey, async (req, res) => {
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
    res.status(500).json({ status: "error", message: "Server error" });
  }
});


// PUT (protected)
app.put("/api/items/:id", requireApiKey, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ status: "error", message: "name is required for PUT" });
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        description: typeof description === "string" ? description.trim() : "",
      },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ status: "error", message: "Item not found" });
    }

    res.json({ status: "ok", message: "Item updated", data: updatedItem });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ status: "error", message: "Invalid item id" });
    }
    res.status(500).json({ status: "error", message: "Server error" });
  }
});


// PATCH (protected)
app.patch("/api/items/:id", requireApiKey, async (req, res) => {
  try {
    const updates = {};
    ["name", "description"].forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field].toString().trim();
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No valid fields provided for PATCH",
      });
    }

    const updatedItem = await Item.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedItem) {
      return res.status(404).json({ status: "error", message: "Item not found" });
    }

    res.json({ status: "ok", message: "Item partially updated", data: updatedItem });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ status: "error", message: "Invalid item id" });
    }
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// DELETE 
app.delete("/api/items/:id", requireApiKey, async (req, res) => {
  try {
    const deleted = await Item.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ status: "error", message: "Item not found" });
    }
    res.json({ status: "ok", message: "Item deleted", data: deleted });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ status: "error", message: "Invalid item id" });
    }
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Version
app.get("/version", (req, res) => {
  res.json({ version: "1.2", updatedAt: "2026-01-28" });
});
// 404 JSON
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});
// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
