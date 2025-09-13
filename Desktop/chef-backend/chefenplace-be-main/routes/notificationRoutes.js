const express = require("express");
const { body, validationResult } = require("express-validator");
const notificationController = require("../controllers/notificationController");
const { auth } = require("../middlewares/auth");
const { headChefAuth } = require("../middlewares/headChefAuth");
const { teamMemberAuth } = require("../middlewares/teamAuth");
const checkPermission = require("../middlewares/checkPermission");
const { checkReadOnlyPermission } = require("../middlewares/readOnlyAuth");
const { ensureConnection } = require("../database/connection");

const router = express.Router();

/** Ensure DB connection for all notification routes (handles serverless cold starts) */
router.use(async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (e) {
    return res.status(503).json({ message: "Database unavailable" });
  }
});

/** All notification routes require an authenticated user */
router.use(auth);

/** Helper: validate express-validator results */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

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
  auth,
  checkReadOnlyPermission("canViewNotifications"),
  notificationController.getUserNotifications
);

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
  auth,
  checkReadOnlyPermission("canViewNotifications"),
  notificationController.getUnreadCount
);

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
  auth,
  checkPermission("canUpdateNotifications"),
  notificationController.markAsRead
);

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
  auth,
  checkPermission("canUpdateNotifications"),
  notificationController.markAllAsRead
);

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
// Restrict creation to Head Chef
router.post(
  "/",
  headChefAuth,
  checkPermission("canCreateNotifications"),
  [
    body("title").trim().isLength({ min: 1 }).withMessage("title is required"),
    body("message").trim().isLength({ min: 1 }).withMessage("message is required"),
    body("recipients").isArray({ min: 1 }).withMessage("recipients must be a non-empty array"),
    body("type").optional().isIn(["info", "warning", "success", "error", "recipe", "system"])
      .withMessage("invalid type"),
  ],
  validate,
  notificationController.sendNotification
);

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
// Restrict deletion to Head Chef
router.delete(
  "/:id",
  headChefAuth,
  checkPermission("canDeleteNotifications"),
  notificationController.deleteNotification
);

module.exports = router;
