const express = require('express')
const { body } = require('express-validator')
const userController = require('../controllers/userController')

const router = express.Router()

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

router.get('/:id', userController.getProfileById)

module.exports = router
