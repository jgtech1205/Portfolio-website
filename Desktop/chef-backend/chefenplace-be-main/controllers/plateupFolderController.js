const { validationResult } = require('express-validator');
const PlateupFolder = require('../database/models/PlateupFolder');
const PlateUp = require('../database/models/plateup');
const User = require('../database/models/User');

const plateupFolderController = {
  // Get all folders for current user
  async getAllFolders(req, res) {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const folders = await PlateupFolder.find({
        $or: [{ createdBy: user._id }, { createdBy: user.headChefId }],
      })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      res.json({ success: true, data: folders });
    } catch (error) {
      console.error('Get plateup folders error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get single folder
  async getFolder(req, res) {
    try {
      const folder = await PlateupFolder.findById(req.params.id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      if (!folder) {
        return res.status(404).json({ message: 'Folder not found' });
      }

      res.json({ success: true, data: folder });
    } catch (error) {
      console.error('Get plateup folder error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Create folder
  async createFolder(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.body;

      const folder = new PlateupFolder({
        name,
        createdBy: req.user._id,
      });

      await folder.save();
      await folder.populate('createdBy', 'name email');

      res.status(201).json({ success: true, data: folder });
    } catch (error) {
      console.error('Create plateup folder error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update folder
  async updateFolder(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const folder = await PlateupFolder.findById(req.params.id);
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found' });
      }

      folder.name = req.body.name || folder.name;
      folder.updatedBy = req.user._id;

      await folder.save();

      res.json({ success: true, data: folder });
    } catch (error) {
      console.error('Update plateup folder error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Delete folder
  async deleteFolder(req, res) {
    try {
      const folder = await PlateupFolder.findById(req.params.id);
      if (!folder) {
        return res.status(404).json({ message: 'Folder not found' });
      }

      // Check if folder has plateups
      const count = await PlateUp.countDocuments({ folder: folder._id });
      if (count > 0) {
        await PlateUp.deleteMany({ folder: folder._id });
      }

      await PlateupFolder.deleteOne({ _id: folder._id });

      res.json({ success: true, message: 'Folder deleted successfully' });
    } catch (error) {
      console.error('Delete plateup folder error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
};

module.exports = plateupFolderController;

