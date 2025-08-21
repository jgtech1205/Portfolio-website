const express = require('express');
const { body } = require('express-validator');
const { auth, teamAuth, organizationAuth, checkPermissionWithOrg } = require('../middlewares/auth');
const checkPermission = require('../middlewares/checkPermission');
const folderController = require('../controllers/plateupFolderController');
const { ensureConnection } = require('../database/connection');

const router = express.Router();

// Database connection middleware for all routes
router.use(async (req, res, next) => {
  try {
    await ensureConnection();
    next();
  } catch (e) {
    return res.status(503).json({ message: 'Database unavailable' });
  }
});

router.use(auth);

// Get all folders
router.get('/', checkPermission('canViewPlateups'), folderController.getAllFolders);

// Get single folder
router.get('/:id', checkPermission('canViewPlateups'), folderController.getFolder);

// Create folder
router.post(
  '/',
  checkPermission('canCreatePlateups'),
  [body('name').notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')],
  folderController.createFolder,
);

// Update folder
router.put(
  '/:id',
  checkPermission('canUpdatePlateups'),
  [body('name').optional().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')],
  folderController.updateFolder,
);

// Delete folder
router.delete('/:id', checkPermission('canDeletePlateups'), folderController.deleteFolder);

module.exports = router;
