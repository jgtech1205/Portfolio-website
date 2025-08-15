const express = require("express")
const { body } = require("express-validator")
const notificationController = require("../controllers/notificationController")
const { auth, teamAuth, organizationAuth, checkPermissionWithOrg } = require("../middlewares/auth")
const checkPermission = require("../middlewares/checkPermission")

const router = express.Router()

// All routes require authentication
router.use(auth)

// Get user notifications
/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notification list
 */
router.get(
  "/",
  checkPermission("canViewNotifications"),
  notificationController.getUserNotifications,
)

// Get unread count
/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get(
  "/unread-count",
  checkPermission("canViewNotifications"),
  notificationController.getUnreadCount,
)

// Mark notification as read
/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put(
  "/:id/read",
  checkPermission("canUpdateNotifications"),
  notificationController.markAsRead,
)

// Mark all as read
/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: All marked as read
 */
router.put(
  "/mark-all-read",
  checkPermission("canUpdateNotifications"),
  notificationController.markAllAsRead,
)

// Send notification (requires permission)
/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Send notification
 *     tags: [Notifications]
 *     responses:
 *       201:
 *         description: Notification sent
 */
router.post(
  "/",
  checkPermission("canCreateNotifications"),
  [
    body("title").trim().isLength({ min: 1 }),
    body("message").trim().isLength({ min: 1 }),
    body("recipients").isArray({ min: 1 }),
    body("type").optional().isIn(["info", "warning", "success", "error", "recipe", "system"]),
  ],
  notificationController.sendNotification,
)

// Delete notification
/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete(
  "/:id",
  checkPermission("canDeleteNotifications"),
  notificationController.deleteNotification,
)

module.exports = router
