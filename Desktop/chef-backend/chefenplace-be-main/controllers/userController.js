const { validationResult } = require('express-validator');
const User = require('../database/models/User');
const Notification = require('../database/models/Notification');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const jwt = require('jsonwebtoken');

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
      const users = await User.find({ isActive: true })
        .select('-password')
        .sort({ role: 1, name: 1 });

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

      const { headChefId, firstName, lastName } = req.body

      const headChef = await User.findOne({ _id: headChefId, role: 'head-chef' })
      if (!headChef) {
        return res.status(404).json({ message: 'Head chef not found' })
      }

      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@chef.local`
      // Check if user already exists
      const existingChef = await User.findOne({ email, headChefId: headChefId, role: 'user' })
      if (existingChef) {
        return res.status(201).json({ 
          id: existingChef._id, 
          status: existingChef.status, 
          userId: existingChef._id 
        })
      }
      const tempPassword = Math.random().toString(36).slice(-8)

      const chef = new User({
        email,
        password: tempPassword,
        name: `${firstName} ${lastName}`,
        firstName: firstName.trim(), // Store as-is for login purposes
        lastName: lastName.trim(),   // Store as-is for login purposes
        role: 'user',
        headChefId: headChefId,
        status: 'pending',
        permissions: {
          // Default view permissions for all resources
          canViewRecipes: true,
          canViewPlateups: true,
          canViewNotifications: true,
          canViewPanels: true,
          // All other permissions remain false by default
          canEditRecipes: false,
          canDeleteRecipes: false,
          canUpdateRecipes: false,
          canCreatePlateups: false,
          canDeletePlateups: false,
          canUpdatePlateups: false,
          canCreateNotifications: false,
          canDeleteNotifications: false,
          canUpdateNotifications: false,
          canCreatePanels: false,
          canDeletePanels: false,
          canUpdatePanels: false,
          canManageTeam: false,
          canAccessAdmin: false,
        },
      })

      await chef.save()

      res.status(201).json({ 
        id: chef._id, 
        status: chef.status, 
        userId: chef._id 
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
};

module.exports = userController;
