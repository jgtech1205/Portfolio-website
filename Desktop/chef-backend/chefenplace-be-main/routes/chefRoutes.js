const express = require('express')
const { body } = require('express-validator')
const userController = require('../controllers/userController')
const authController = require('../controllers/authController')
const { auth } = require('../middlewares/auth')
const { ensureConnection } = require('../database/connection')

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

// Request access to join a head chef's team
router.post(
  '/request-access',
  [
    body('headChefId').isMongoId(),
    body('firstName').trim().isLength({ min: 1 }),
    body('lastName').trim().isLength({ min: 1 }),
  ],
  userController.requestChefAccess,
)

// Pending requests management endpoints (for frontend compatibility)
router.get('/pending-requests', auth, authController.getPendingRequests)

router.get('/:id', userController.getProfileById)
router.put('/approve-request/:requestId', auth, authController.approveRequest)
router.put('/reject-request/:requestId', auth, authController.rejectRequest)

module.exports = router
