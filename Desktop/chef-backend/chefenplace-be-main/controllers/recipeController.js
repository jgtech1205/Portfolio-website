const { validationResult } = require('express-validator');
const Recipe = require('../database/models/Recipe');
const Panel = require('../database/models/Panel');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const OpenAI = require('openai');
const sharp = require('sharp');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const recipeController = {
  // Get all recipes
  async getAllRecipes(req, res) {
    try {
      const { page = 1, limit = 10, search, panel } = req.query;
      const query = { isActive: true };

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { 'ingredients.name': { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ];
      }

      if (panel) {
        query.panel = panel;
      }

      const recipes = await Recipe.find(query)
        .populate('panel', 'name')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Recipe.countDocuments(query);

      res.json({
        success: true,
        data: recipes,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get recipes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get recipes by panel
  async getRecipesByPanel(req, res) {
    try {
      const { panelId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const recipes = await Recipe.find({ panel: panelId, isActive: true })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Recipe.countDocuments({
        panel: panelId,
        isActive: true,
      });

      res.json({
        success: true,
        data: recipes,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get recipes by panel error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Search recipes
  async searchRecipes(req, res) {
    try {
      const { q, difficulty, prepTime, cookTime } = req.query;
      const query = { isActive: true };

      if (q) {
        query.$or = [
          { title: { $regex: q, $options: 'i' } },
          { 'ingredients.name': { $regex: q, $options: 'i' } },
          { method: { $regex: q, $options: 'i' } },
          { tags: { $in: [new RegExp(q, 'i')] } },
        ];
      }

      if (difficulty) {
        query.difficulty = difficulty;
      }

      if (prepTime) {
        query.prepTime = { $lte: Number.parseInt(prepTime) };
      }

      if (cookTime) {
        query.cookTime = { $lte: Number.parseInt(cookTime) };
      }

      const recipes = await Recipe.find(query)
        .populate('panel', 'name')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(20);

      res.json({
        success: true,
        data: recipes,
      });
    } catch (error) {
      console.error('Search recipes error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get single recipe
  async getRecipe(req, res) {
    try {
      const recipe = await Recipe.findById(req.params.id)
        .populate('panel', 'name')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      if (!recipe || !recipe.isActive) {
        return res.status(404).json({ message: 'Recipe not found' });
      }

      res.json({
        success: true,
        data: recipe,
      });
    } catch (error) {
      console.error('Get recipe error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Create recipe
  async createRecipe(req, res) {
    try {
      const {
        title,
        panel,
        ingredients,
        method,
        prepTime,
        cookTime,
        servings,
        difficulty,
        tags,
        chefNotes,
      } = req.body;
      let imageData = null;

      // Handle image upload
      if (req.file) {
        const uploadResult = await uploadImage(req.file, 'recipes');
        imageData = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        };
      }

      const recipe = new Recipe({
        title,
        panel,
        image: imageData,
        ingredients,
        method,
        chefNotes,
        prepTime: prepTime ? Number.parseInt(prepTime) : 0,
        cookTime: cookTime ? Number.parseInt(cookTime) : 0,
        servings: servings ? Number.parseInt(servings) : 1,
        difficulty: difficulty || 'medium',
        tags: tags
          ? Array.isArray(tags)
            ? tags
            : tags.split(',').map((t) => t.trim())
          : [],
        createdBy: req.user.id,
      });

      await recipe.save();
      await recipe.populate(['panel createdBy', 'title']);

      res.status(201).json({
        success: true,
        message: 'Recipe created successfully',
        data: recipe,
      });
    } catch (error) {
      console.error('Create recipe error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Update recipe
  async updateRecipe(req, res) {
    try {
      const recipe = await Recipe.findById(req.params.id);
      if (!recipe || !recipe.isActive) {
        return res.status(404).json({ message: 'Recipe not found' });
      }

      const {
        title,
        panel,
        ingredients,
        method,
        prepTime,
        cookTime,
        servings,
        difficulty,
        tags,
      } = req.body;
      let imageData = recipe.image;

      // Handle image upload
      if (req.file) {
        // Delete old image if exists
        if (recipe.image && recipe.image.publicId) {
          await deleteImage(recipe.image.publicId);
        }

        const uploadResult = await uploadImage(req.file, 'recipes');
        imageData = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        };
      }

      // Parse ingredients if it's a string
      let parsedIngredients = ingredients;
      if (typeof ingredients === 'string') {
        try {
          parsedIngredients = JSON.parse(ingredients);
        } catch (e) {
          parsedIngredients = ingredients
            .split('\n')
            .map((ing) => ({ name: ing.trim() }));
        }
      }

      recipe.title = title || recipe.title;
      recipe.panel = panel || recipe.panel;
      recipe.image = imageData;
      recipe.ingredients = parsedIngredients || recipe.ingredients;
      recipe.method = method || recipe.method;
      recipe.prepTime = prepTime ? Number.parseInt(prepTime) : recipe.prepTime;
      recipe.cookTime = cookTime ? Number.parseInt(cookTime) : recipe.cookTime;
      recipe.servings = servings ? Number.parseInt(servings) : recipe.servings;
      recipe.difficulty = difficulty || recipe.difficulty;
      recipe.tags = tags
        ? Array.isArray(tags)
          ? tags
          : tags.split(',').map((t) => t.trim())
        : recipe.tags;
      recipe.updatedBy = req.user.id;
      recipe.version += 1;

      await recipe.save();
      await recipe.populate(['panel createdBy updatedBy', 'name']);

      res.json({
        success: true,
        message: 'Recipe updated successfully',
        data: recipe,
      });
    } catch (error) {
      console.error('Update recipe error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Delete recipe
  async deleteRecipe(req, res) {
    try {
      const recipe = await Recipe.findById(req.params.id);
      if (!recipe || !recipe.isActive) {
        return res.status(404).json({ message: 'Recipe not found' });
      }

      // Soft delete
      recipe.isActive = false;
      recipe.updatedBy = req.user.id;
      await recipe.save();

      // Delete image if exists
      if (recipe.image && recipe.image.publicId) {
        await deleteImage(recipe.image.publicId);
      }

      res.json({
        success: true,
        message: 'Recipe deleted successfully',
      });
    } catch (error) {
      console.error('Delete recipe error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // AI scan ingredients using OpenAI Vision API
  async aiScanIngredients(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      // Compress image to reduce token usage, optimize for text readability
      const compressed = await sharp(req.file.buffer)
        .resize({ width: 384 }) // Reduced width for smaller size
        .grayscale() // Convert to grayscale for better OCR and smaller size
        .jpeg({ quality: 60 }) // Lower quality, but still readable for text
        .sharpen() // Slightly sharpen to enhance text edges
        .toBuffer();

      const base64Image = compressed.toString('base64');
      const prompt = `Extract the recipe ingredients from this image, don't give any prefix like here are extracted ingredients etc just directly paste ingredients or items as bullet points. If the text in image is not recognizeable, just return the text is unclear`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini-2024-07-18',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Image}` },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const ingredients = completion.choices[0].message.content.trim();

      res.json({ success: true, data: { ingredients } });
    } catch (error) {
      console.error('AI scan ingredients error:', error.message || error);
      res.status(500).json({ message: 'Server error' });
    }
  },
};

module.exports = recipeController;
