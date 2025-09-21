const express = require("express")
const { body } = require("express-validator")
const plateupController = require("../controllers/plateupController")
const { auth, teamAuth, organizationAuth, checkPermissionWithOrg } = require("../middlewares/auth")
const checkPermission = require("../middlewares/checkPermission")
const { checkReadOnlyPermission } = require("../middlewares/readOnlyAuth")
const upload = require("../middlewares/upload")
const { ensureConnection } = require("../database/connection")

const router = express.Router()

// Database connection middleware for all routes
router.use(async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (e) {
    return res.status(503).json({ message: 'Database unavailable' });
  }
});

// All routes require authentication
router.use(auth)

// Get all plateups
router.get("/", checkReadOnlyPermission("canViewPlateups"), plateupController.getAllPlateups)

// Get single plateup
router.get("/:id", checkReadOnlyPermission("canViewPlateups"), plateupController.getPlateup)

// Create plateup
router.post(
  "/",
  checkPermission("canCreatePlateups"),
  upload.single('image'),
  [
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Title must be between 2 and 100 characters'),
    body('folder')
      .optional()
      .isMongoId()
      .withMessage('Invalid folder id'),
  ],
  plateupController.createPlateup
)

// Update plateup
router.put(
  "/:id",
  checkPermission("canUpdatePlateups"),
  upload.single('image'),
  [
    body('title')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Title must be between 2 and 100 characters'),
    body('folder')
      .optional()
      .isMongoId()
      .withMessage('Invalid folder id'),
  ],
  plateupController.updatePlateup
)

// Delete plateup
router.delete(
  "/:id",
  checkPermission("canDeletePlateups"),
  plateupController.deletePlateup
)

module.exports = router
