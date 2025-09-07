const { validationResult } = require('express-validator');
const Plateup = require('../database/models/plateup');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const User = require('../database/models/User');

// CRUD
const plateupController = {
    // Get all plateups
    async getAllPlateups(req, res) {
        try {
            const { folder } = req.query;
            
            // Use headChefId for proper organization isolation
            const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;
            
            console.log('🔍 Getting plateups for head chef:', {
                headChefId: headChefId,
                userRole: req.user?.role,
                userId: req.user?._id
            });

            const query = { 
                isActive: true,
                headChefId: headChefId // Filter by organization
            };
            
            if (folder) {
                query.folder = folder;
            }

            const plateups = await Plateup.find(query)
                .sort({ createdAt: -1 })
                .populate('folder', 'name')
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email');

            console.log(`✅ Found ${plateups.length} plateups for head chef ${headChefId}`);

            res.json({
                success: true,
                data: plateups,
            });
        } catch (error) {
            console.error('Get plateups error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Get single plateup
    async getPlateup(req, res) {
        try {
            const plateup = await Plateup.findById(req.params.id)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email');

            if (!plateup) {
                return res.status(404).json({ message: 'Plateup not found' });
            }

            res.json({
                success: true,
                data: plateup,
            });
        } catch (error) {
            console.error('Get plateup error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Create plateup
    async createPlateup(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, folder } = req.body;
            let imageData = null;

            // Handle image upload
            if (req.file) {
                const uploadResult = await uploadImage(req.file, 'plateups');
                imageData = {
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                };
            }

            const plateup = new Plateup({
                name,
                folder,
                image: imageData,
                createdBy: req.user._id,
            });

            await plateup.save();

            res.status(201).json({
                success: true,
                data: plateup,
            });
        } catch (error) {
            console.error('Create plateup error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },


    // Update plateup
    async updatePlateup(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const plateup = await Plateup.findById(req.params.id);
            if (!plateup) {
                return res.status(404).json({ message: 'Plateup not found' });
            }

            const { name, folder } = req.body;
            let imageData = plateup.image;

            // Handle image upload
            if (req.file) {
                // Delete old image if exists
                if (plateup.image && plateup.image.publicId) {
                    await deleteImage(plateup.image.publicId);
                }

                const uploadResult = await uploadImage(req.file, 'plateups');
                imageData = {
                    url: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                };
            }

            plateup.name = name || plateup.name;
            plateup.folder = folder !== undefined ? folder : plateup.folder;
            plateup.image = imageData;
            plateup.updatedBy = req.user._id;

            await plateup.save();

            res.json({
                success: true,
                data: plateup,
            });
        } catch (error) {
            console.error('Update plateup error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    },

    // Delete plateup
    async deletePlateup(req, res) {
        try {
            const plateup = await Plateup.findById(req.params.id);
            if (!plateup) {
                return res.status(404).json({ message: 'Plateup not found' });
            }

            await Plateup.findByIdAndDelete(req.params.id);

            if (plateup.image && plateup.image.publicId) {
                await deleteImage(plateup.image.publicId);
            }

            res.json({
                success: true,
                message: 'Plateup deleted successfully',
            });
        } catch (error) {
            console.error('Delete plateup error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
};

module.exports = plateupController;
