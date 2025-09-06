const mongoose = require("mongoose")

const panelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
    order: {
      type: Number,
      default: 0,
    },
    recipeCount: {
      type: Number,
      default: 0,
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
  },
  {
    timestamps: true,
  },
)

// Update recipe count when recipes are added/removed
panelSchema.methods.updateRecipeCount = async function () {
  const Recipe = mongoose.model("Recipe")
  const count = await Recipe.countDocuments({ panel: this._id, isActive: true })
  this.recipeCount = count
  await this.save()
}

module.exports = mongoose.model("Panel", panelSchema)
