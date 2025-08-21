const { validationResult } = require("express-validator")
const Notification = require("../database/models/Notification")
const User = require("../database/models/User")

const notificationController = {
  // Get user notifications
  async getUserNotifications(req, res) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = req.query
      const userId = req.user._id
      
      // Use headChefId for proper organization isolation
      const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;
      
      console.log('🔍 Getting notifications for head chef:', {
        headChefId: headChefId,
        userRole: req.user?.role,
        userId: userId
      });

      const baseMatch = {
        isActive: true,
        headChefId: headChefId, // Filter by organization
        $or: [
          { "recipients.user": userId },
          { sender: userId },
        ],
      }

      const notifications = await Notification.aggregate([
        { $match: baseMatch },
        { $unwind: "$recipients" },
        {
          $match: {
            $or: [
              { "recipients.user": userId },
              { sender: userId },
            ],
            ...(unreadOnly === "true" ? { "recipients.read": false } : {}),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
            as: "sender",
            pipeline: [{ $project: { name: 1, email: 1 } }],
          },
        },
        { $unwind: "$sender" },
        {
          $project: {
            title: 1,
            message: 1,
            type: 1,
            priority: 1,
            sender: 1,
            read: {
              $cond: {
                if: { $eq: ["$recipients.user", userId] },
                then: "$recipients.read",
                else: true,
              },
            },
            readAt: {
              $cond: {
                if: { $eq: ["$recipients.user", userId] },
                then: "$recipients.readAt",
                else: null,
              },
            },
            createdAt: 1,
            relatedEntity: 1,
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
      ])

      const totalResult = await Notification.aggregate([
        { $match: baseMatch },
        { $unwind: "$recipients" },
        {
          $match: {
            $or: [
              { "recipients.user": userId },
              { sender: userId },
            ],
            ...(unreadOnly === "true" ? { "recipients.read": false } : {}),
          },
        },
        { $count: "total" },
      ])

      const total = totalResult[0]?.total || 0

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("Get user notifications error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },


  // Get unread count
  async getUnreadCount(req, res) {
    try {
      // Use headChefId for proper organization isolation
      const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;
      
      const count = await Notification.countDocuments({
        "recipients.user": req.user.id,
        "recipients.read": false,
        isActive: true,
        headChefId: headChefId, // Filter by organization
      })

      res.json({
        success: true,
        data: { unreadCount: count },
      })
    } catch (error) {
      console.error("Get unread count error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      // Use headChefId for proper organization isolation
      const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;
      
      const notification = await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          headChefId: headChefId, // Ensure notification belongs to this organization
          "recipients.user": req.user.id,
        },
        {
          $set: {
            "recipients.$.read": true,
            "recipients.$.readAt": new Date(),
          },
        },
        { new: true },
      )

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" })
      }

      res.json({
        success: true,
        message: "Notification marked as read",
      })
    } catch (error) {
      console.error("Mark as read error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Mark all as read
  async markAllAsRead(req, res) {
    try {
      // Use headChefId for proper organization isolation
      const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;
      
      await Notification.updateMany(
        {
          headChefId: headChefId, // Ensure notifications belong to this organization
          "recipients.user": req.user.id,
          "recipients.read": false,
        },
        {
          $set: {
            "recipients.$.read": true,
            "recipients.$.readAt": new Date(),
          },
        },
      )

      res.json({
        success: true,
        message: "All notifications marked as read",
      })
    } catch (error) {
      console.error("Mark all as read error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Send notification
  async sendNotification(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { title, message, recipients, type = "info", priority = "medium", scheduledFor } = req.body

      // Use headChefId for proper organization isolation
      const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;
      
      console.log('🔍 Creating notification for head chef:', {
        headChefId: headChefId,
        userRole: req.user?.role,
        senderId: req.user?.id
      });

      // Validate recipients (only team members from this headchef)
      const validUsers = await User.find({
        _id: { $in: recipients },
        headChefId: headChefId, // Only team members from this headchef
        isActive: true,
        role: { $in: ["user", "team-member"] } // Only team members, not other headchefs
      }).select("_id firstName lastName email")

      if (validUsers.length === 0) {
        return res.status(400).json({ message: "No valid recipients found. Recipients must be team members from your organization." })
      }

      console.log(`✅ Found ${validUsers.length} valid recipients:`, validUsers.map(u => `${u.firstName} ${u.lastName}`));

      const notification = new Notification({
        title,
        message,
        type,
        priority,
        headChefId: headChefId, // Set organization context
        sender: req.user.id,
        recipients: validUsers.map((user) => ({ user: user._id })),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      })

      await notification.save()
      await notification.populate("sender", "name email avatar")

      console.log(`✅ Notification created successfully: ${notification.title}`);

      res.status(201).json({
        success: true,
        message: "Notification sent successfully",
        data: notification,
      })
    } catch (error) {
      console.error("Send notification error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const notification = await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          $or: [{ sender: req.user.id }, { "recipients.user": req.user.id }],
        },
        { isActive: false },
        { new: true },
      )

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" })
      }

      res.json({
        success: true,
        message: "Notification deleted successfully",
      })
    } catch (error) {
      console.error("Delete notification error:", error)
      res.status(500).json({ message: "Server error" })
    }
  },
}

module.exports = notificationController
