const mongoose = require("mongoose")

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    panel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Panel",
      required: true,
    },
    headChefId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Index for efficient queries
    },
    image: {
      url: String,
      publicId: String,
    },
    ingredients:  {type: 'Mixed', required: true},
    method: {
      type: String,
      required: true,
    },
    prepTime: {
      type: Number, // in minutes
      default: 0,
    },
    cookTime: {
      type: Number, // in minutes
      default: 0,
    },
    servings: {
      type: Number,
      default: 1,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    tags: [String],
    nutritionalInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
      fiber: Number,
    },
    chefNotes: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
)

// Update panel recipe count after save
recipeSchema.post("save", async function () {
  const Panel = mongoose.model("Panel")
  const panel = await Panel.findById(this.panel)
  if (panel) {
    await panel.updateRecipeCount()
  }
})

// Update panel recipe count after remove
recipeSchema.post("remove", async function () {
  const Panel = mongoose.model("Panel")
  const panel = await Panel.findById(this.panel)
  if (panel) {
    await panel.updateRecipeCount()
  }
})

module.exports = mongoose.model("Recipe", recipeSchema)
