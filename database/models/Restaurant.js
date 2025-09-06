const mongoose = require("mongoose")

const restaurantSchema = new mongoose.Schema(
  {
    restaurantName: {
      type: String,
      required: true,
      trim: true,
    },
    restaurantType: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        trim: true,
        default: "United States",
      },
    },
    headChefId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    planType: {
      type: String,
      enum: ["trial", "pro", "enterprise"],
      default: "trial",
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "cancelled", "past_due"],
      default: "active",
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
    },
    trialEndDate: {
      type: Date,
      default: function() {
        // 14-day trial for new restaurants
        const trialEnd = new Date()
        trialEnd.setDate(trialEnd.getDate() + 14)
        return trialEnd
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    signupDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for efficient queries
restaurantSchema.index({ headChefId: 1 })
restaurantSchema.index({ stripeCustomerId: 1 })
restaurantSchema.index({ subscriptionStatus: 1 })
restaurantSchema.index({ planType: 1 })

module.exports = mongoose.model("Restaurant", restaurantSchema)
