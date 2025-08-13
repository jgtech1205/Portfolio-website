const { validationResult } = require('express-validator');
const Panel = require('../database/models/Panel');
const Recipe = require('../database/models/Recipe');
const { uploadImage, deleteImage } = require('../config/cloudinary');

const panelController = {
  // Get all panels
  async getAllPanels(req, res) {
    try {
      const panels = await Panel.find({ isActive: true })
        .sort({ order: 1, createdAt: 1 })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      res.json({
        success: true,
        data: panels,
      });
    } catch (error) {
      console.error('Get panels error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get single panel
  async getPanel(req, res) {
    try {
      const panel = await Panel.findById(req.params.id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      if (!panel || !panel.isActive) {
        return res.status(404).json({ message: 'Panel not found' });
      }

      res.json({
        success: true,
        data: panel,
      });
    } catch (error) {
      console.error('Get panel error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Create panel
  async createPanel(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.body;
      let imageData = null;

      // Handle image upload
      if (req.file) {
        const uploadResult = await uploadImage(req.file, 'panels');
        imageData = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        };
      }

      // Get the highest order number
      const lastPanel = await Panel.findOne().sort({ order: -1 });
      const order = lastPanel ? lastPanel.order + 1 : 1;

      const panel = new Panel({
        name,
        image: imageData,
        order,
        createdBy: req.user.id,
      });

      await panel.save();
      await panel.populate('createdBy', 'name email');

      res.status(201).json({
        success: true,
        message: 'Panel created successfully',
        data: panel,
      });
    } catch (error) {
      console.error('Create panel error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update panel
  async updatePanel(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const panel = await Panel.findById(req.params.id);
      if (!panel || !panel.isActive) {
        return res.status(404).json({ message: 'Panel not found' });
      }

      const { name } = req.body;
      let imageData = panel.image;

      // Handle image upload
      if (req.file) {
        // Delete old image if exists
        if (panel.image && panel.image.publicId) {
          await deleteImage(panel.image.publicId);
        }

        const uploadResult = await uploadImage(req.file, 'panels');
        imageData = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        };
      }

      panel.name = name || panel.name;
      panel.image = imageData;
      panel.updatedBy = req.user.id;

      await panel.save();
      await panel.populate(['createdBy updatedBy', 'name email']);

      res.json({
        success: true,
        message: 'Panel updated successfully',
        data: panel,
      });
    } catch (error) {
      console.error('Update panel error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Delete panel
  async deletePanel(req, res) {
    try {
      const panel = await Panel.findById(req.params.id);
      if (!panel || !panel.isActive) {
        return res.status(404).json({ message: 'Panel not found' });
      }

      // Check if panel has recipes
      const recipeCount = await Recipe.countDocuments({
        panel: panel._id,
        isActive: true,
      });
      if (recipeCount > 0) {
       await Recipe.deleteMany({ panel: panel._id });
      }

      // Soft delete
      panel.isActive = false;
      panel.updatedBy = req.user.id;
      await panel.save();

      // Delete image if exists
      if (panel.image && panel.image.publicId) {
        await deleteImage(panel.image.publicId);
      }

      res.json({
        success: true,
        message: 'Panel deleted successfully',
      });
    } catch (error) {
      console.error('Delete panel error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Reorder panels
  async reorderPanels(req, res) {
    try {
      const { panels } = req.body;

      if (!Array.isArray(panels)) {
        return res.status(400).json({ message: 'Panels must be an array' });
      }

      // Update order for each panel
      const updatePromises = panels.map((panelData) => {
        return Panel.findByIdAndUpdate(panelData.id, {
          order: panelData.order,
          updatedBy: req.user.id,
        });
      });

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: 'Panels reordered successfully',
      });
    } catch (error) {
      console.error('Reorder panels error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },
};

module.exports = panelController;
