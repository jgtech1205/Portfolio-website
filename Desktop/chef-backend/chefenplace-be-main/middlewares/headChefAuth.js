const jwt = require("jsonwebtoken")
const User = require("../database/models/User")
const Restaurant = require("../database/models/Restaurant")
const { verifyTokenWithContext } = require("../utils/tokenUtils")

// Head chef authentication middleware with restaurant isolation
const headChefAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    // Verify token and extract context
    const tokenContext = verifyTokenWithContext(token)
    if (!tokenContext.valid) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Get user from database
    const user = await User.findById(tokenContext.userId).select("-password")
    if (!user) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Ensure user is a head chef
    if (user.role !== "head-chef") {
      return res.status(403).json({ 
        message: "Access denied. Head chef access only." 
      })
    }

    // Check if user is active
    if (user.status !== "active") {
      return res.status(401).json({ 
        message: "Account not active. Please contact support." 
      })
    }

    // Ensure user has a headChefId (should be their own _id)
    if (!user.headChefId) {
      return res.status(403).json({ 
        message: "Access denied. Head chef not properly configured." 
      })
    }

    // Verify headChefId matches user's own _id
    if (user.headChefId.toString() !== user._id.toString()) {
      return res.status(403).json({ 
        message: "Access denied. Invalid head chef configuration." 
      })
    }

    // Get the user's restaurant (optional for now)
    const restaurant = await Restaurant.findOne({ headChefId: user._id })

    // Set user and restaurant context
    req.user = user
    req.restaurant = restaurant
    req.headChefContext = {
      userId: user._id,
      headChefId: user.headChefId,
      restaurantId: restaurant?._id || null,
      restaurantName: restaurant?.restaurantName || null,
      permissions: user.permissions
    }

    // console.log('🔐 Head chef authenticated:', {
    //   userId: user._id,
    //   restaurantId: restaurant?._id || null,
    //   restaurantName: restaurant?.restaurantName || 'No Restaurant',
    //   email: user.email,
    //   permissions: user.permissions
    // })

    next()
  } catch (error) {
    console.error("Head chef auth middleware error:", error)
    res.status(401).json({ message: "Invalid token." })
  }
}

// Restaurant-scoped head chef authentication
const restaurantHeadChefAuth = async (req, res, next) => {
  try {
    const { restaurantId } = req.params
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." })
    }

    // Verify token and extract context
    const tokenContext = verifyTokenWithContext(token)
    if (!tokenContext.valid) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Get user from database
    const user = await User.findById(tokenContext.userId).select("-password")
    if (!user) {
      return res.status(401).json({ message: "Invalid token." })
    }

    // Ensure user is a head chef
    if (user.role !== "head-chef") {
      return res.status(403).json({ 
        message: "Access denied. Head chef access only." 
      })
    }

    // Check if user is active
    if (user.status !== "active") {
      return res.status(401).json({ 
        message: "Account not active. Please contact support." 
      })
    }

    // Get the restaurant and verify ownership
    const restaurant = await Restaurant.findById(restaurantId)
    if (!restaurant) {
      return res.status(404).json({ 
        message: "Restaurant not found." 
      })
    }

    // Verify the restaurant belongs to this head chef
    if (restaurant.headChefId.toString() !== user._id.toString()) {
      return res.status(403).json({ 
        message: "Access denied. You can only access your own restaurant." 
      })
    }

    // Set user and restaurant context
    req.user = user
    req.restaurant = restaurant
    req.headChefContext = {
      userId: user._id,
      headChefId: user.headChefId,
      restaurantId: restaurant._id,
      restaurantName: restaurant.restaurantName,
      permissions: user.permissions
    }

    next()
  } catch (error) {
    console.error("Restaurant head chef auth middleware error:", error)
    res.status(401).json({ message: "Invalid token." })
  }
}

module.exports = {
  headChefAuth,
  restaurantHeadChefAuth
}
