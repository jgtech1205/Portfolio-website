const express = require("express")
const { body } = require("express-validator")
const panelController = require("../controllers/panelController")
const { auth, teamAuth, organizationAuth, checkPermissionWithOrg } = require("../middlewares/auth")
const { headChefAuth } = require("../middlewares/headChefAuth")
const checkPermission = require("../middlewares/checkPermission")
const { readOnlyAuth, checkReadOnlyPermission } = require("../middlewares/readOnlyAuth")
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

// Organization-based routes (allow both headchefs and their team members)
router.use("/", readOnlyAuth)

// Get all panels
/**
 * @swagger
 * /api/panels:
 *   get:
 *     summary: Get all panels
 *     tags: [Panels]
 *     responses:
 *       200:
 *         description: List of panels
 */
router.get("/", checkReadOnlyPermission("canViewPanels"), panelController.getAllPanels)

// Reorder panels (must be before /:id routes)
/**
 * @swagger
 * /api/panels/reorder:
 *   put:
 *     summary: Reorder panels
 *     tags: [Panels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - panels
 *             properties:
 *               panels:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     order:
 *                       type: number
 *     responses:
 *       200:
 *         description: Panels reordered successfully
 *       400:
 *         description: Invalid request data
 */
router.put(
  "/reorder",
  checkPermission("canUpdatePanels"),
  [body("panels").isArray()],
  panelController.reorderPanels,
)

// Get single panel
/**
 * @swagger
 * /api/panels/{id}:
 *   get:
 *     summary: Get panel by ID
 *     tags: [Panels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Panel data
 */
router.get("/:id", checkReadOnlyPermission("canViewPanels"), panelController.getPanel)

// Create panel (requires edit permission)
/**
 * @swagger
 * /api/panels:
 *   post:
 *     summary: Create panel
 *     tags: [Panels]
 *     responses:
 *       201:
 *         description: Panel created
 */
router.post(
  "/",
  checkPermission("canCreatePanels"),
  upload.single("image"),
  [body("name").trim().isLength({ min: 1 })],
  panelController.createPanel,
)

// Update panel
/**
 * @swagger
 * /api/panels/{id}:
 *   put:
 *     summary: Update panel
 *     tags: [Panels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Panel updated
 */
router.put(
  "/:id",
  checkPermission("canUpdatePanels"),
  upload.single("image"),
  [body("name").optional().trim().isLength({ min: 1 })],
  panelController.updatePanel,
)

// Delete panel
/**
 * @swagger
 * /api/panels/{id}:
 *   delete:
 *     summary: Delete panel
 *     tags: [Panels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Panel deleted
 */
router.delete(
  "/:id",
  checkPermission("canDeletePanels"),
  panelController.deletePanel,
)

module.exports = router
