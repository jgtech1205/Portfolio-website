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
      
      // Use headChefContext from headChefAuth middleware
      const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;
      
      console.log('🔍 Getting recipes for head chef:', {
        headChefId: headChefId,
        userRole: req.user?.role,
        restaurantId: req.headChefContext?.restaurantId
      });

      const query = { 
        isActive: true,
        headChefId: headChefId // Filter by restaurant
      };

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
      
      // Use headChefContext from headChefAuth middleware
      const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;

      const recipes = await Recipe.find({ 
        panel: panelId, 
        isActive: true,
        headChefId: headChefId // Filter by restaurant
      })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Recipe.countDocuments({
        panel: panelId,
        isActive: true,
        headChefId: headChefId // Filter by restaurant
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
      
      // Use headChefContext from headChefAuth middleware
      const headChefId = req.headChefContext?.headChefId || req.user?.headChefId;
      
      const query = { 
        isActive: true,
        headChefId: headChefId // Filter by restaurant
      };

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
        headChefId: req.user.headChefId,
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
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const recipe = await Recipe.findById(req.params.id);
      if (!recipe || !recipe.isActive) {
        return res.status(404).json({ message: 'Recipe not found' });
      }

      const {
        title,
        panel,
        method,
        chefNotes,
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

      // Parse ingredients from multipart form data format: ingredients[0][name], ingredients[1][name], etc.
      let parsedIngredients = [];
      const ingredientKeys = Object.keys(req.body).filter(key => key.startsWith('ingredients['));
      
      // Debug logging for FormData parsing
      console.log('FormData received:', {
        body: req.body,
        ingredientKeys: ingredientKeys,
        hasFile: !!req.file
      });
      
      if (ingredientKeys.length > 0) {
        // Extract ingredients from multipart format
        ingredientKeys.forEach(key => {
          const match = key.match(/ingredients\[(\d+)\]\[name\]/);
          if (match) {
            const index = parseInt(match[1]);
            const ingredientName = req.body[key];
            if (ingredientName && ingredientName.trim()) {
              parsedIngredients[index] = { name: ingredientName.trim() };
            }
          }
        });
        // Remove any undefined slots and ensure proper array
        parsedIngredients = parsedIngredients.filter(ing => ing && ing.name);
        console.log('Parsed ingredients from multipart:', parsedIngredients);
      } else if (req.body.ingredients) {
        // Fallback: handle if ingredients is sent as JSON string or array
        if (typeof req.body.ingredients === 'string') {
          try {
            parsedIngredients = JSON.parse(req.body.ingredients);
          } catch (e) {
            parsedIngredients = req.body.ingredients
              .split('\n')
              .filter(ing => ing.trim())
              .map((ing) => ({ name: ing.trim() }));
          }
        } else if (Array.isArray(req.body.ingredients)) {
          parsedIngredients = req.body.ingredients;
        }
      }

      // Update only provided fields
      if (title !== undefined) recipe.title = title;
      if (panel !== undefined) recipe.panel = panel;
      if (method !== undefined) recipe.method = method;
      if (chefNotes !== undefined) recipe.chefNotes = chefNotes;
      if (parsedIngredients.length > 0) recipe.ingredients = parsedIngredients;
      if (imageData !== undefined) recipe.image = imageData;
      if (prepTime !== undefined) recipe.prepTime = prepTime ? Number.parseInt(prepTime) : 0;
      if (cookTime !== undefined) recipe.cookTime = cookTime ? Number.parseInt(cookTime) : 0;
      if (servings !== undefined) recipe.servings = servings ? Number.parseInt(servings) : 1;
      if (difficulty !== undefined) recipe.difficulty = difficulty;
      if (tags !== undefined) {
        recipe.tags = tags
          ? Array.isArray(tags)
            ? tags
            : tags.split(',').map((t) => t.trim())
          : [];
      }
      recipe.updatedBy = req.user.id;
      recipe.version += 1;

      await recipe.save();
      await recipe.populate(['panel', 'createdBy', 'updatedBy']);

      // Return the updated recipe object matching the Recipe interface
      res.json({
        id: recipe._id.toString(),
        title: recipe.title,
        panel: recipe.panel._id.toString(),
        method: recipe.method,
        chefNotes: recipe.chefNotes,
        ingredients: recipe.ingredients,
        image: recipe.image,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        tags: recipe.tags,
        isActive: recipe.isActive,
        createdBy: recipe.createdBy._id.toString(),
        updatedBy: recipe.updatedBy ? recipe.updatedBy._id.toString() : null,
        version: recipe.version,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt
      });
    } catch (error) {
      console.error('Update recipe error:', error);
      res.status(500).json({ 
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
