const { validationResult } = require('express-validator');
const User = require('../database/models/User');
const Request = require('../database/models/Request');
const Notification = require('../database/models/Notification');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const userController = {
  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id).select('-password');

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: user._id },
        });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already in use' });
        }
      }

      user.name = name || user.name;
      user.email = email || user.email;

      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Upload avatar
  async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      const user = await User.findById(req.user.id);

      // Delete old avatar if exists
      if (user.avatar) {
        // Extract public_id from cloudinary URL if needed
        // await deleteImage(publicId);
      }

      // Upload new avatar
      const uploadResult = await uploadImage(req.file, 'avatars');

      user.avatar = uploadResult.secure_url;
      await user.save();

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Delete avatar
  async deleteAvatar(req, res) {
    try {
      const user = await User.findById(req.user.id);

      if (user.avatar) {
        // Delete from cloudinary if needed
        user.avatar = null;
        await user.save();
      }

      res.json({
        success: true,
        message: 'Avatar deleted successfully',
      });
    } catch (error) {
      console.error('Delete avatar error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Change password
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: 'Current password is incorrect' });
      }

      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update preferences
  async updatePreferences(req, res) {
    try {
      const { language, notifications } = req.body;
      const user = await User.findById(req.user.id);

      if (language) {
        user.preferences.language = language;
      }

      if (notifications) {
        user.preferences.notifications = {
          ...user.preferences.notifications,
          ...notifications,
        };
      }

      await user.save();

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: user.preferences,
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get team members
  async getTeamMembers(req, res) {
    try {
      // Use headChefContext from headChefAuth middleware
      const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;
      
      console.log('🔍 Getting team members for head chef:', {
        headChefId: headChefId,
        userRole: req.user?.role,
        restaurantId: req.headChefContext?.restaurantId
      });

      // Filter team members by headChefId to ensure restaurant isolation
      const users = await User.find({ 
        headChefId: headChefId,
        role: { $in: ["user", "team-member"] } // Only team members, not head chefs
      })
        .select('-password')
        .sort({ role: 1, firstName: 1, lastName: 1 });

      console.log(`✅ Found ${users.length} team members for restaurant`);

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('Get team members error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Invite team member
  async inviteTeamMember(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, firstName, lastName, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: 'User with this email already exists' });
      }

      // Create new user with temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const newUser = new User({
        email,
        password: tempPassword,
        firstName,
        lastName,
        role,
      });

      await newUser.save();

      // In production, send invitation email with temporary password

      res.status(201).json({
        success: true,
        message: 'Team member invited successfully',
        data: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          tempPassword, // Remove this in production
        },
      });
    } catch (error) {
      console.error('Invite team member error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update team member
  async updateTeamMember(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role, isActive, status, permissions } = req.body;
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (role) user.role = role;
      if (typeof isActive === 'boolean') user.isActive = isActive;

      if (permissions) {
        user.permissions = { ...user.permissions, ...permissions };
      }

      if (status) user.status = status;
      await user.save();

      res.json({
        success: true,
        message: 'Team member updated successfully',
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          status: user.status,
        },
      });
    } catch (error) {
      console.error('Update team member error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Remove team member
  async removeTeamMember(req, res) {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Soft delete - deactivate user
      user.isActive = false;
      await user.save();

      res.json({
        success: true,
        message: 'Team member removed successfully',
      });
    } catch (error) {
      console.error('Remove team member error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Generate invite link for new chefs
  async generateInviteLink(req, res) {
    try {
      const token = jwt.sign(
        { headChefId: req.user.id },
        process.env.CHEF_INVITE_SECRET || 'chef-invite-secret',
        { expiresIn: '7d' },
      );

      const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/chef-invite/${token}`;

      res.json({ success: true, url });
    } catch (error) {
      console.error('Generate invite link error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get team access link for the logged-in head chef
  async getTeamAccessLink(req, res) {
    try {
      // Use headChefContext from headChefAuth middleware
      const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;
      
      console.log('🔗 Generating team access link for head chef:', {
        headChefId: headChefId,
        userRole: req.user?.role,
        restaurantId: req.headChefContext?.restaurantId
      });

      if (!headChefId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Head chef ID not found' 
        });
      }

      const teamAccessUrl = `${process.env.FRONTEND_URL || 'https://chef-frontend-psi.vercel.app'}/team-access/${headChefId}`;
      
      console.log('✅ Team access link generated:', teamAccessUrl);

      res.json({ 
        success: true, 
        teamAccessUrl,
        headChefId: headChefId,
        restaurantName: req.headChefContext?.restaurantName || req.user?.restaurantName
      });
    } catch (error) {
      console.error('Get team access link error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // List pending chefs for head chef
  async listPendingChefs(req, res) {
    try {
      const chefs = await User.find({ headChefId: req.user.id, role: 'user', status: 'pending' }).select('name status');
      res.json({ success: true, data: chefs });
    } catch (error) {
      console.error('List pending chefs error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Approve or reject pending chef
  async updatePendingChef(req, res) {
    try {
      const { status } = req.body;
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected"' });
      }

      const chef = await User.findOne({ _id: req.params.id, headChefId: req.user.id, role: 'user' });
      if (!chef) {
        return res.status(404).json({ message: 'Chef not found' });
      }

      // Update status
      chef.status = status;

      // If approving, set default permissions for team members
      if (status === 'approved') {
        chef.permissions = {
          // Recipe permissions - view only for team members
          canViewRecipes: true,
          canEditRecipes: false,
          canDeleteRecipes: false,
          canUpdateRecipes: false,

          // Plateup permissions - view only for team members
          canViewPlateups: true,
          canCreatePlateups: false,
          canDeletePlateups: false,
          canUpdatePlateups: false,

          // Notification permissions - view only for team members
          canViewNotifications: true,
          canCreateNotifications: false,
          canDeleteNotifications: false,
          canUpdateNotifications: false,

          // Panel permissions - view only for team members
          canViewPanels: true,
          canCreatePanels: false,
          canDeletePanels: false,
          canUpdatePanels: false,

          // Other permissions - no admin access for team members
          canManageTeam: false,
          canAccessAdmin: false,
        };

        // Send notification to approved team member
        const notification = new Notification({
          title: 'Team Access Approved',
          message: `Congratulations! Your team access request has been approved by ${req.user.name}. You can now log in using your first name as username and last name as password.`,
          type: 'success',
          priority: 'medium',
          sender: req.user.id,
          recipients: [{ user: chef._id }],
        });

        await notification.save();
      }

      await chef.save();

      res.json({ 
        success: true, 
        message: `Chef ${status === 'approved' ? 'approved' : 'rejected'} successfully`, 
        data: { 
          id: chef._id, 
          status: chef.status,
          firstName: chef.firstName,
          lastName: chef.lastName
        } 
      });
    } catch (error) {
      console.error('Update pending chef error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Request access to become a chef under a head chef
  async requestChefAccess(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }

      const { headChefId, firstName, lastName, organization } = req.body

      const headChef = await User.findOne({ _id: headChefId, role: 'head-chef' })
      if (!headChef) {
        return res.status(404).json({ message: 'Head chef not found' })
      }

      // Check if a request already exists for this person
      const existingRequest = await Request.findOne({ 
        headChefId: headChefId, 
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        status: 'pending'
      })
      
      if (existingRequest) {
        return res.status(201).json({ 
          id: existingRequest._id, 
          status: existingRequest.status, 
          requestId: existingRequest._id 
        })
      }

      // Create a new request record with organization
      const request = new Request({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        headChefId: headChefId,
        organization: organization || headChef.organization || 'Default Organization',
        status: 'pending'
      })

      await request.save()

      console.log('✅ New team member request created:', {
        requestId: request._id,
        firstName: request.firstName,
        lastName: request.lastName,
        headChefId: request.headChefId,
        organization: request.organization
      })

      res.status(201).json({ 
        id: request._id, 
        status: request.status, 
        requestId: request._id 
      })
    } catch (error) {
      console.error('Request chef access error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  },

  // Get user status by ID
  async getUserStatus(req, res) {
    try {
      const user = await User.findById(req.params.id).select('status');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ success: true, status: user.status });
    } catch (error) {
      console.error('Get user status error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get profile by user ID
  async getProfileById(req, res) {
    try {
      const user = await User.findById(req.params.id).select('name status');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Get profile by id error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get saved recipes for workstation
  async getSavedRecipes(req, res) {
    try {
      const user = await User.findById(req.user.id).populate('savedRecipes');
      res.json({ success: true, data: user.savedRecipes || [] });
    } catch (error) {
      console.error('Get saved recipes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get head chef organization information
  async getHeadChefOrganization(req, res) {
    try {
      const { headChefId } = req.params;

      // Validate headChefId
      if (!mongoose.Types.ObjectId.isValid(headChefId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid head chef ID',
          code: 'INVALID_HEAD_CHEF_ID'
        });
      }

      // Find the head chef
      const headChef = await User.findOne({
        _id: headChefId,
        role: 'head-chef'
      }).select('firstName lastName name organization role');

      if (!headChef) {
        return res.status(404).json({
          success: false,
          message: 'Head chef not found',
          code: 'HEAD_CHEF_NOT_FOUND'
        });
      }

      console.log('✅ Head chef organization retrieved:', {
        headChefId: headChef._id,
        organization: headChef.organization,
        name: headChef.name
      });

      res.status(200).json({
        success: true,
        data: {
          id: headChef._id,
          firstName: headChef.firstName,
          lastName: headChef.lastName,
          name: headChef.name,
          organization: headChef.organization,
          role: headChef.role
        }
      });

    } catch (error) {
      console.error('❌ Get head chef organization error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get head chef organization',
        code: 'INTERNAL_ERROR'
      });
    }
  },
};

module.exports = userController;
