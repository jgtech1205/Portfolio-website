const express = require("express")
const { body } = require("express-validator")
const plateupController = require("../controllers/plateupController")
const auth = require("../middlewares/auth")
const checkPermission = require("../middlewares/checkPermission")
const upload = require("../middlewares/upload")

const router = express.Router()

// All routes require authentication
router.use(auth)

// Get all plateups
router.get("/", checkPermission("canViewPlateups"), plateupController.getAllPlateups)

// Get single plateup
router.get("/:id", checkPermission("canViewPlateups"), plateupController.getPlateup)

// Create plateup
router.post(
  "/",
  checkPermission("canCreatePlateups"),
  upload.single('image'),
  [
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
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
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
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
