const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      index: true, // Index for login queries
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      index: true, // Index for login queries
    },
    name: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    organization: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["head-chef", "user", "team-member"],
      default: "user",
    },
    headChefId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "active", "inactive"],
      default: "pending",
    },
    savedRecipes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recipe",
      },
    ],
    avatar: {
      type: String,
      default: null,
    },
    permissions: {
      // Recipe permissions
      canViewRecipes: { type: Boolean, default: false },
      canEditRecipes: { type: Boolean, default: false },
      canDeleteRecipes: { type: Boolean, default: false },
      canUpdateRecipes: { type: Boolean, default: false },

      // Plateup permissions
      canViewPlateups: { type: Boolean, default: false },
      canCreatePlateups: { type: Boolean, default: false },
      canDeletePlateups: { type: Boolean, default: false },
      canUpdatePlateups: { type: Boolean, default: false },

      // Notification permissions
      canViewNotifications: { type: Boolean, default: false },
      canCreateNotifications: { type: Boolean, default: false },
      canDeleteNotifications: { type: Boolean, default: false },
      canUpdateNotifications: { type: Boolean, default: false },

      // Panel permissions
      canViewPanels: { type: Boolean, default: false },
      canCreatePanels: { type: Boolean, default: false },
      canDeletePanels: { type: Boolean, default: false },
      canUpdatePanels: { type: Boolean, default: false },

      // Other
      canManageTeam: { type: Boolean, default: false },
      canAccessAdmin: { type: Boolean, default: false },
    },
    preferences: {
      language: {
        type: String,
        default: "English",
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// Compute name field from firstName and lastName
userSchema.pre("save", function (next) {
  if (this.firstName && this.lastName) {
    this.name = `${this.firstName} ${this.lastName}`
  }
  next()
})

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Set headChefId for head chefs
userSchema.pre("save", function (next) {
  // For head chefs, set headChefId to their own _id if not already set
  if (this.role === "head-chef" && this._id && !this.headChefId) {
    this.headChefId = this._id;
  }
  next();
});

// Set permissions based on role
userSchema.pre("save", function (next) {
  console.log('🔧 Setting permissions for user:', {
    isNew: this.isNew,
    role: this.role,
    hasPermissions: !!this.permissions,
    canManageTeam: this.permissions?.canManageTeam
  });

  // Always set permissions for new users or when role is modified
  if (this.isNew || this.isModified("role") || !this.permissions) {
    console.log('   Setting permissions for role:', this.role);
    
    switch (this.role) {
      case "head-chef":
        this.permissions = {
          // Recipes
          canViewRecipes: true,
          canEditRecipes: true,
          canDeleteRecipes: true,
          canUpdateRecipes: true,

          // Plateups
          canViewPlateups: true,
          canCreatePlateups: true,
          canDeletePlateups: true,
          canUpdatePlateups: true,

          // Notifications
          canViewNotifications: true,
          canCreateNotifications: true,
          canDeleteNotifications: true,
          canUpdateNotifications: true,

          // Panels
          canViewPanels: true,
          canCreatePanels: true,
          canDeletePanels: true,
          canUpdatePanels: true,

          // Other
          canManageTeam: true,
          canAccessAdmin: true,
        }
        console.log('   ✅ Head chef permissions set:', this.permissions);
        break;
        
      case "team-member":
      case "user":
        // Set default permissions for team members
        this.permissions = {
          // Recipe permissions - view only for team members
          canViewRecipes: true,
          canEditRecipes: false,
          canDeleteRecipes: false,
          canUpdateRecipes: false,

          // Plateup permissions - view only for team members
          canViewPlateups: true,
          canCreatePlateups: false,
          canDeletePlateups: false,
          canUpdatePlateups: false,

          // Notification permissions - view only for team members
          canViewNotifications: true,
          canCreateNotifications: false,
          canDeleteNotifications: false,
          canUpdateNotifications: false,

          // Panel permissions - view only for team members
          canViewPanels: true,
          canCreatePanels: false,
          canDeletePanels: false,
          canUpdatePanels: false,

          // Other permissions - no admin access for team members
          canManageTeam: false,
          canAccessAdmin: false,
        }
        console.log('   ✅ Team member permissions set:', this.permissions);
        break;
        
      default:
        console.log('   ⚠️ Unknown role:', this.role);
        // Set minimal permissions for unknown roles
        this.permissions = {
          canViewRecipes: false,
          canEditRecipes: false,
          canDeleteRecipes: false,
          canUpdateRecipes: false,
          canViewPlateups: false,
          canCreatePlateups: false,
          canDeletePlateups: false,
          canUpdatePlateups: false,
          canViewNotifications: false,
          canCreateNotifications: false,
          canDeleteNotifications: false,
          canUpdateNotifications: false,
          canViewPanels: false,
          canCreatePanels: false,
          canDeletePanels: false,
          canUpdatePanels: false,
          canManageTeam: false,
          canAccessAdmin: false,
        }
    }
  } else {
    console.log('   ✅ Permissions already set correctly');
  }
  
  next()
})

// Indexes for efficient queries
userSchema.index({ headChefId: 1, firstName: 1, lastName: 1 }) // For team login queries
userSchema.index({ headChefId: 1, status: 1 }) // For pending/approved user queries
userSchema.index({ email: 1 }) // Email queries (already unique)
userSchema.index({ role: 1, status: 1 }) // For role-based queries

module.exports = mongoose.model("User", userSchema)
