const User = require("../database/models/User")
const Panel = require("../database/models/Panel")
const Recipe = require("../database/models/Recipe")
const Notification = require("../database/models/Notification")

const adminController = {
  // Get dashboard stats
  async getDashboardStats(req, res) {
    try {
      const [totalUsers, activeUsers, totalPanels, totalRecipes, totalNotifications, recentUsers] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Panel.countDocuments({ isActive: true }),
        Recipe.countDocuments({ isActive: true }),
        Notification.countDocuments({ isActive: true }),
        User.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).select("name email role createdAt"),
      ])

      // Get user distribution by role
      const usersByRole = await User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ])

      // Get recipe distribution by panel
      const recipesByPanel = await Recipe.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: "panels",
            localField: "panel",
            foreignField: "_id",
            as: "panel",
          },
        },
        { $unwind: "$panel" },
        { $group: { _id: "$panel.name", count: { $sum: 1 } } },
      ])

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers,
            activeUsers,
            totalPanels,
            totalRecipes,
            totalNotifications,
          },
          usersByRole,
          recipesByPanel,
          recentUsers,
        },
      })
    } catch (error) {
      console.error("Get dashboard stats error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Get all users
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, search, role, status } = req.query
      const query = {}

      if (search) {
        query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
      }

      if (role) {
        query.role = role
      }

      if (status) {
        query.isActive = status === "active"
      }

      const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await User.countDocuments(query)

      res.json({
        success: true,
        data: users,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("Get all users error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Get single user
  async getUser(req, res) {
    try {
      const user = await User.findById(req.params.id).select("-password")

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      // Get user's activity stats
      const [recipesCreated, notificationsSent] = await Promise.all([
        Recipe.countDocuments({ createdBy: user._id }),
        Notification.countDocuments({ sender: user._id }),
      ])

      res.json({
        success: true,
        data: {
          ...user.toObject(),
          stats: {
            recipesCreated,
            notificationsSent,
          },
        },
      })
    } catch (error) {
      console.error("Get user error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Update user
  async updateUser(req, res) {
    try {
      const { role, isActive, permissions } = req.body
      const user = await User.findById(req.params.id)

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      if (role) user.role = role
      if (typeof isActive === "boolean") user.isActive = isActive
      if (permissions) {
        user.permissions = { ...user.permissions, ...permissions }
      }

      await user.save()

      res.json({
        success: true,
        message: "User updated successfully",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          permissions: user.permissions,
        },
      })
    } catch (error) {
      console.error("Update user error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Delete user
  async deleteUser(req, res) {
    try {
      const user = await User.findById(req.params.id)

      if (!user) {
        return res.status(404).json({ message: "User not found" })
      }

      // Soft delete - deactivate user
      user.isActive = false
      await user.save()

      res.json({
        success: true,
        message: "User deleted successfully",
      })
    } catch (error) {
      console.error("Delete user error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Get system settings
  async getSystemSettings(req, res) {
    try {
      // In a real app, you'd have a Settings model
      const settings = {
        siteName: "Chef en Place",
        allowRegistration: true,
        defaultRole: "user",
        maxFileSize: "5MB",
        supportedImageTypes: ["jpg", "jpeg", "png", "webp"],
        notificationSettings: {
          emailEnabled: true,
          pushEnabled: true,
          defaultNotificationTypes: ["info", "warning", "success"],
        },
      }

      res.json({
        success: true,
        data: settings,
      })
    } catch (error) {
      console.error("Get system settings error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Update system settings
  async updateSystemSettings(req, res) {
    try {
      // In a real app, you'd update a Settings model
      const updatedSettings = req.body

      res.json({
        success: true,
        message: "System settings updated successfully",
        data: updatedSettings,
      })
    } catch (error) {
      console.error("Update system settings error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Get activity logs
  async getActivityLogs(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query

      // In a real app, you'd have an ActivityLog model
      // For now, return recent activities from various models
      const recentRecipes = await Recipe.find({ isActive: true })
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .limit(10)
        .select("title createdBy createdAt")

      const recentUsers = await User.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("name email role createdAt")

      const activities = [
        ...recentRecipes.map((recipe) => ({
          type: "recipe_created",
          description: `Recipe "${recipe.title}" was created`,
          user: recipe.createdBy,
          timestamp: recipe.createdAt,
        })),
        ...recentUsers.map((user) => ({
          type: "user_registered",
          description: `User "${user.name}" registered as ${user.role}`,
          user: { name: user.name, email: user.email },
          timestamp: user.createdAt,
        })),
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      res.json({
        success: true,
        data: activities.slice(0, limit),
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: activities.length,
        },
      })
    } catch (error) {
      console.error("Get activity logs error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Create backup
  async createBackup(req, res) {
    try {
      // In a real app, you'd create actual database backups
      const backupId = `backup_${Date.now()}`

      res.json({
        success: true,
        message: "Backup created successfully",
        data: {
          backupId,
          createdAt: new Date(),
          size: "2.5MB", // Mock size
        },
      })
    } catch (error) {
      console.error("Create backup error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Restore backup
  async restoreBackup(req, res) {
    try {
      const { backupId } = req.body

      if (!backupId) {
        return res.status(400).json({ message: "Backup ID is required" })
      }

      // In a real app, you'd restore from actual backup
      res.json({
        success: true,
        message: "Backup restored successfully",
        data: {
          backupId,
          restoredAt: new Date(),
        },
      })
    } catch (error) {
      console.error("Restore backup error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
}

module.exports = adminController
