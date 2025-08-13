const express = require("express")
const { body } = require("express-validator")
const recipeController = require("../controllers/recipeController")
const auth = require("../middlewares/auth")
const checkPermission = require("../middlewares/checkPermission")
const upload = require("../middlewares/upload")

const router = express.Router()

// All routes require authentication
router.use(auth)

// Get all recipes
/**
 * @swagger
 * /api/recipes:
 *   get:
 *     summary: Get all recipes
 *     tags: [Recipes]
 *     responses:
 *       200:
 *         description: List of recipes
 */
router.get("/", checkPermission("canViewRecipes"), recipeController.getAllRecipes)

// Get recipes by panel
/**
 * @swagger
 * /api/recipes/panel/{panelId}:
 *   get:
 *     summary: Get recipes by panel
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: panelId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of recipes
 */
router.get(
  "/panel/:panelId",
  checkPermission("canViewRecipes"),
  recipeController.getRecipesByPanel,
)

// Search recipes
/**
 * @swagger
 * /api/recipes/search:
 *   get:
 *     summary: Search recipes
 *     tags: [Recipes]
 *     responses:
 *       200:
 *         description: Search results
 */
router.get("/search", checkPermission("canViewRecipes"), recipeController.searchRecipes)

// Get single recipe
/**
 * @swagger
 * /api/recipes/{id}:
 *   get:
 *     summary: Get recipe by ID
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recipe data
 */
router.get("/:id", checkPermission("canViewRecipes"), recipeController.getRecipe)

// Create recipe (requires edit permission)
/**
 * @swagger
 * /api/recipes:
 *   post:
 *     summary: Create recipe
 *     tags: [Recipes]
 *     responses:
 *       201:
 *         description: Recipe created
 */
router.post(
  "/",
  checkPermission("canEditRecipes"),
  upload.single("image"),
  [
    body("title").trim().isLength({ min: 1 }),
    body("panel").isMongoId(),
    body("ingredients").isArray({ min: 1 }),
    body("method").trim().isLength({ min: 10 }),
  ],
  recipeController.createRecipe,
)

// Update recipe
/**
 * @swagger
 * /api/recipes/{id}:
 *   put:
 *     summary: Update recipe
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recipe updated
 */
router.put(
  "/:id",
  checkPermission("canUpdateRecipes"),
  upload.single("image"),
  recipeController.updateRecipe,
)

// Delete recipe
/**
 * @swagger
 * /api/recipes/{id}:
 *   delete:
 *     summary: Delete recipe
 *     tags: [Recipes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recipe deleted
 */
router.delete(
  "/:id",
  checkPermission("canDeleteRecipes"),
  recipeController.deleteRecipe,
)

// AI scan ingredients
/**
 * @swagger
 * /api/recipes/ai-scan:
 *   post:
 *     summary: AI scan ingredients
 *     tags: [Recipes]
 *     responses:
 *       200:
 *         description: Scan result
 */
router.post("/ai-scan", checkPermission("canEditRecipes"), upload.single("file"), recipeController.aiScanIngredients)

module.exports = router
