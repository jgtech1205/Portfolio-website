const User = require("../database/models/User")

/**
 * Validates team member credentials for login with enhanced error handling
 * @param {string} headChefId - The head chef's user ID (organization identifier)
 * @param {string} username - The team member's first name
 * @param {string} password - The team member's last name
 * @returns {Promise<Object>} - Result object with user data and error information
 */
const validateTeamMemberCredentials = async (headChefId, username, password) => {
  try {
    // Input validation
    if (!headChefId || !username || !password) {
      return {
        success: false,
        error: 'MISSING_CREDENTIALS',
        message: 'Username and password are required',
        user: null
      }
    }

    // Normalize inputs for case-insensitive comparison
    const normalizedUsername = username.trim().toLowerCase()
    const normalizedPassword = password.trim().toLowerCase()

    // First, check if the headChefId exists and is a head chef
    const headChef = await User.findOne({ 
      _id: headChefId, 
      role: 'head-chef',
      isActive: true 
    }).select('_id role status')

    if (!headChef) {
      return {
        success: false,
        error: 'ORGANIZATION_NOT_FOUND',
        message: 'Invalid credentials',
        user: null
      }
    }

    // Find all team members in the organization (including pending for better error handling)
    const teamMembers = await User.find({
      headChefId: headChefId,
      role: "user",
      isActive: true
    }).select("firstName lastName email name role permissions avatar status headChefId organization")

    if (!teamMembers || teamMembers.length === 0) {
      return {
        success: false,
        error: 'NO_TEAM_MEMBERS',
        message: 'Invalid credentials',
        user: null
      }
    }

    // Find exact matches (case-insensitive)
    const exactMatches = teamMembers.filter(member => {
      const memberFirstName = member.firstName?.trim().toLowerCase() || ""
      const memberLastName = member.lastName?.trim().toLowerCase() || ""
      
      return memberFirstName === normalizedUsername && memberLastName === normalizedPassword
    })

    // Handle no matches
    if (exactMatches.length === 0) {
      return {
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
        user: null
      }
    }

    // Handle duplicate names
    if (exactMatches.length > 1) {
      console.warn(`validateTeamMemberCredentials: Multiple users found with same name in organization ${headChefId}:`, 
        exactMatches.map(u => ({ id: u._id, firstName: u.firstName, lastName: u.lastName })))
      
      // Return the most recently approved user
      const sortedMatches = exactMatches.sort((a, b) => {
        // Prioritize active over approved
        if (a.status === "active" && b.status !== "active") return -1
        if (b.status === "active" && a.status !== "active") return 1
        
        // If same status, return the most recently updated
        return new Date(b.updatedAt) - new Date(a.updatedAt)
      })
      
      const selectedUser = sortedMatches[0]
      
      // Check if the selected user is approved
      if (selectedUser.status !== "approved" && selectedUser.status !== "active") {
        return {
          success: false,
          error: 'USER_NOT_APPROVED',
          message: 'Account not approved. Please contact your head chef for approval.',
          user: selectedUser
        }
      }
      
      return {
        success: true,
        error: null,
        message: 'Login successful (duplicate names resolved)',
        user: selectedUser
      }
    }

    // Single exact match found
    const user = exactMatches[0]
    
    // Check user status
    if (user.status === "pending") {
      return {
        success: false,
        error: 'USER_NOT_APPROVED',
        message: 'Account not approved. Please contact your head chef for approval.',
        user: user
      }
    }
    
    if (user.status === "rejected") {
      return {
        success: false,
        error: 'USER_REJECTED',
        message: 'Account has been rejected. Please contact your head chef.',
        user: user
      }
    }
    
    if (user.status === "inactive") {
      return {
        success: false,
        error: 'USER_INACTIVE',
        message: 'Account is inactive. Please contact your head chef.',
        user: user
      }
    }

    // User is approved/active
    return {
      success: true,
      error: null,
      message: 'Login successful',
      user: user
    }

  } catch (error) {
    console.error("validateTeamMemberCredentials: Error validating credentials:", error)
    return {
      success: false,
      error: 'SYSTEM_ERROR',
      message: 'System error occurred',
      user: null
    }
  }
}

/**
 * Validates team member credentials with additional security checks
 * @param {string} headChefId - The head chef's user ID
 * @param {string} username - The team member's first name
 * @param {string} password - The team member's last name
 * @param {Object} options - Additional validation options
 * @param {boolean} options.requireUniqueName - Whether to require unique names within organization
 * @param {boolean} options.includeInactive - Whether to include inactive users
 * @returns {Promise<Object|null>} - User object if valid, null if invalid
 */
const validateTeamMemberCredentialsAdvanced = async (headChefId, username, password, options = {}) => {
  try {
    const { requireUniqueName = false, includeInactive = false } = options

    // Input validation
    if (!headChefId || !username || !password) {
      // console.log("validateTeamMemberCredentialsAdvanced: Missing required parameters")
      return null
    }

    // Normalize inputs
    const normalizedUsername = username.trim().toLowerCase()
    const normalizedPassword = password.trim().toLowerCase()

    // Build query based on options
    const query = {
      headChefId: headChefId,
      role: "user",
      isActive: true
    }

    // Status filter
    if (includeInactive) {
      query.status = { $in: ["pending", "approved", "active", "inactive"] }
    } else {
      query.status = { $in: ["approved", "active"] }
    }

    // Find team members
    const teamMembers = await User.find(query).select("firstName lastName email name role permissions avatar status headChefId organization")

    if (!teamMembers || teamMembers.length === 0) {
      // console.log(`validateTeamMemberCredentialsAdvanced: No team members found for headChefId: ${headChefId}`)
      return null
    }

    // Find exact matches
    const exactMatches = teamMembers.filter(member => {
      const memberFirstName = member.firstName?.trim().toLowerCase() || ""
      const memberLastName = member.lastName?.trim().toLowerCase() || ""
      
      return memberFirstName === normalizedUsername && memberLastName === normalizedPassword
    })

    if (exactMatches.length === 0) {
      // console.log(`validateTeamMemberCredentialsAdvanced: No exact matches found`)
      return null
    }

    // Handle duplicate names
    if (exactMatches.length > 1) {
      if (requireUniqueName) {
        console.warn(`validateTeamMemberCredentialsAdvanced: Multiple users with same name found, but unique names required`)
        return null
      }
      
      // Return the most recently approved user
      const sortedMatches = exactMatches.sort((a, b) => {
        // Prioritize active over approved
        if (a.status === "active" && b.status !== "active") return -1
        if (b.status === "active" && a.status !== "active") return 1
        
        // If same status, return the most recently updated
        return new Date(b.updatedAt) - new Date(a.updatedAt)
      })
      
      // console.log(`validateTeamMemberCredentialsAdvanced: Returning most recent match for duplicate names: ${sortedMatches[0]._id}`)
      return sortedMatches[0]
    }

    // Single match found
    const user = exactMatches[0]
    console.log(`validateTeamMemberCredentialsAdvanced: Valid credentials for user: ${user._id}`)
    return user

  } catch (error) {
    console.error("validateTeamMemberCredentialsAdvanced: Error validating credentials:", error)
    return null
  }
}

/**
 * Checks if a team member name is unique within an organization
 * @param {string} headChefId - The head chef's user ID
 * @param {string} firstName - The team member's first name
 * @param {string} lastName - The team member's last name
 * @param {string} excludeUserId - User ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if unique, false if duplicate exists
 */
const isTeamMemberNameUnique = async (headChefId, firstName, lastName, excludeUserId = null) => {
  try {
    const normalizedFirstName = firstName.trim().toLowerCase()
    const normalizedLastName = lastName.trim().toLowerCase()

    const query = {
      headChefId: headChefId,
      role: "user",
      isActive: true
    }

    // Exclude specific user (for updates)
    if (excludeUserId) {
      query._id = { $ne: excludeUserId }
    }

    const existingUsers = await User.find(query).select("firstName lastName")

    const hasDuplicate = existingUsers.some(user => {
      const userFirstName = user.firstName?.trim().toLowerCase() || ""
      const userLastName = user.lastName?.trim().toLowerCase() || ""
      
      return userFirstName === normalizedFirstName && userLastName === normalizedLastName
    })

    return !hasDuplicate
  } catch (error) {
    console.error("isTeamMemberNameUnique: Error checking name uniqueness:", error)
    return false
  }
}

/**
 * Gets all team members in an organization with their login credentials
 * @param {string} headChefId - The head chef's user ID
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {boolean} options.includeInactive - Whether to include inactive users
 * @returns {Promise<Array>} - Array of team members with login info
 */
const getTeamMembersWithCredentials = async (headChefId, options = {}) => {
  try {
    const { status, includeInactive = false } = options

    const query = {
      headChefId: headChefId,
      role: "user",
      isActive: true
    }

    if (status) {
      query.status = status
    } else if (!includeInactive) {
      query.status = { $in: ["approved", "active"] }
    }

    const teamMembers = await User.find(query)
      .select("firstName lastName email name role permissions avatar status headChefId organization createdAt updatedAt")
      .sort({ firstName: 1, lastName: 1 })

    return teamMembers.map(member => ({
      id: member._id,
      firstName: member.firstName,
      lastName: member.lastName,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      permissions: member.permissions,
      avatar: member.avatar,
      organization: member.organization,
      loginCredentials: {
        username: member.firstName, // First name as username
        password: member.lastName   // Last name as password
      },
      createdAt: member.createdAt,
      updatedAt: member.updatedAt
    }))
  } catch (error) {
    console.error("getTeamMembersWithCredentials: Error fetching team members:", error)
    return []
  }
}

/**
 * Test function to demonstrate the utility functions
 * @param {string} headChefId - The head chef's user ID
 * @returns {Promise<Object>} - Test results
 */
const testTeamAuthUtils = async (headChefId) => {
  try {
    console.log("=== Testing Team Auth Utils ===")
    
    // Test 1: Get all team members with credentials
    console.log("\n1. Getting all team members with credentials...")
    const teamMembers = await getTeamMembersWithCredentials(headChefId)
    console.log(`Found ${teamMembers.length} team members`)
    
    if (teamMembers.length > 0) {
      const firstMember = teamMembers[0]
      console.log("Sample team member:", {
        name: firstMember.name,
        loginCredentials: firstMember.loginCredentials,
        status: firstMember.status
      })
      
      // Test 2: Validate credentials for first team member
      console.log("\n2. Testing credential validation...")
      const { username, password } = firstMember.loginCredentials
      const validatedUser = await validateTeamMemberCredentials(headChefId, username, password)
      
      if (validatedUser) {
        console.log("✅ Credential validation successful for:", validatedUser.name)
      } else {
        console.log("❌ Credential validation failed")
      }
      
      // Test 3: Test with invalid credentials
      console.log("\n3. Testing with invalid credentials...")
      const invalidUser = await validateTeamMemberCredentials(headChefId, "Invalid", "Credentials")
      console.log(invalidUser ? "❌ Invalid credentials were accepted" : "✅ Invalid credentials properly rejected")
      
      // Test 4: Check name uniqueness
      console.log("\n4. Testing name uniqueness...")
      const isUnique = await isTeamMemberNameUnique(headChefId, firstMember.firstName, firstMember.lastName)
      console.log(`Name "${firstMember.firstName} ${firstMember.lastName}" is ${isUnique ? 'unique' : 'not unique'} in organization`)
    }
    
    console.log("\n=== Test Complete ===")
    return { success: true, teamMembersCount: teamMembers.length }
    
  } catch (error) {
    console.error("testTeamAuthUtils: Error during testing:", error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  validateTeamMemberCredentials,
  validateTeamMemberCredentialsAdvanced,
  isTeamMemberNameUnique,
  getTeamMembersWithCredentials,
  testTeamAuthUtils
}
