const express = require('express');
const { body, param, query } = require('express-validator');
const Food = require('../models/Food');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

// @desc    Get personalized recipe recommendations
// @route   GET /api/recipes/recommendations
// @access  Private
router.get('/recommendations', protect, [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], validateRequest, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const user = req.user;

    // Build recommendation filter based on user preferences
    const filter = {};
    
    // Filter by dietary preferences
    if (user.profile.dietaryPreferences && user.profile.dietaryPreferences.length > 0) {
      if (user.profile.dietaryPreferences.includes('vegetarian')) {
        filter.isVegetarian = true;
      }
      if (user.profile.dietaryPreferences.includes('vegan')) {
        filter.isVegan = true;
      }
      if (user.profile.dietaryPreferences.includes('gluten-free')) {
        filter.isGlutenFree = true;
      }
    }

    // Filter by spice level
    if (user.preferences.spiceLevel) {
      const spiceLevels = ['mild', 'medium', 'hot', 'extra-hot'];
      const userSpiceIndex = spiceLevels.indexOf(user.preferences.spiceLevel);
      const allowedSpiceLevels = spiceLevels.slice(0, userSpiceIndex + 1);
      filter.spiceLevel = { $in: allowedSpiceLevels };
    }

    // Filter by favorite cuisines
    if (user.profile.favoriteCuisines && user.profile.favoriteCuisines.length > 0) {
      filter.cuisine = { $in: user.profile.favoriteCuisines };
    }

    // Filter by cooking experience
    if (user.profile.cookingExperience) {
      const experienceMap = {
        'beginner': ['easy'],
        'intermediate': ['easy', 'medium'],
        'advanced': ['easy', 'medium', 'hard'],
        'professional': ['easy', 'medium', 'hard']
      };
      filter.difficulty = { $in: experienceMap[user.profile.cookingExperience] || ['easy'] };
    }

    // Get recommendations
    const recommendations = await Food.find(filter)
      .sort({ popularity: -1, 'rating.average': -1 })
      .limit(limit)
      .populate('createdBy', 'name profile.avatar');

    res.json({
      status: 'success',
      data: { recommendations }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get recipes based on available ingredients
// @route   POST /api/recipes/by-ingredients
// @access  Public
router.post('/by-ingredients', [
  body('ingredients').isArray({ min: 1 }).withMessage('At least one ingredient is required'),
  body('ingredients.*').isString().trim().notEmpty().withMessage('Each ingredient must be a non-empty string'),
  body('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], validateRequest, async (req, res, next) => {
  try {
    const { ingredients, limit = 10 } = req.body;
    
    // Convert ingredients to lowercase for case-insensitive search
    const searchIngredients = ingredients.map(ingredient => ingredient.toLowerCase());

    // Find recipes that contain any of the provided ingredients
    const recipes = await Food.find({
      'ingredients.name': { 
        $in: searchIngredients.map(ingredient => new RegExp(ingredient, 'i'))
      }
    })
    .sort({ popularity: -1 })
    .limit(limit)
    .populate('createdBy', 'name profile.avatar');

    // Score recipes based on ingredient matches
    const scoredRecipes = recipes.map(recipe => {
      const matchedIngredients = recipe.ingredients.filter(ingredient => 
        searchIngredients.some(searchIngredient => 
          ingredient.name.toLowerCase().includes(searchIngredient)
        )
      );
      
      const matchScore = matchedIngredients.length / recipe.ingredients.length;
      
      return {
        ...recipe.toObject(),
        matchScore,
        matchedIngredients: matchedIngredients.map(ing => ing.name)
      };
    });

    // Sort by match score
    scoredRecipes.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      status: 'success',
      data: { 
        recipes: scoredRecipes,
        searchIngredients
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get quick recipes (under 30 minutes)
// @route   GET /api/recipes/quick
// @access  Public
router.get('/quick', [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  query('maxTime').optional().isInt({ min: 5, max: 60 }).withMessage('Max time must be between 5 and 60 minutes')
], validateRequest, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const maxTime = parseInt(req.query.maxTime) || 30;

    const quickRecipes = await Food.find({
      $expr: {
        $lte: [
          { $add: ['$prepTime', '$cookTime'] },
          maxTime
        ]
      }
    })
    .sort({ popularity: -1 })
    .limit(limit)
    .populate('createdBy', 'name profile.avatar');

    res.json({
      status: 'success',
      data: { quickRecipes }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get trending recipes
// @route   GET /api/recipes/trending
// @access  Public
router.get('/trending', [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  query('timeframe').optional().isIn(['day', 'week', 'month']).withMessage('Timeframe must be day, week, or month')
], validateRequest, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const timeframe = req.query.timeframe || 'week';

    // Calculate date based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const trendingRecipes = await Food.find({
      createdAt: { $gte: startDate }
    })
    .sort({ popularity: -1, 'rating.average': -1 })
    .limit(limit)
    .populate('createdBy', 'name profile.avatar');

    res.json({
      status: 'success',
      data: { 
        trendingRecipes,
        timeframe,
        startDate
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark recipe as cooked
// @route   POST /api/recipes/:id/cook
// @access  Private
router.post('/:id/cook', protect, [
  param('id').isMongoId().withMessage('Invalid recipe ID')
], validateRequest, async (req, res, next) => {
  try {
    const recipe = await Food.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        status: 'error',
        message: 'Recipe not found'
      });
    }

    // Update user's cooking stats
    await req.user.incrementCookingStreak();

    res.json({
      status: 'success',
      message: 'Recipe marked as cooked! Great job! 🎉',
      data: {
        recipe: {
          _id: recipe._id,
          name: recipe.name
        },
        userStats: {
          recipesCooked: req.user.stats.recipesCooked + 1,
          cookingStreak: req.user.stats.cookingStreak + 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Add recipe to favorites
// @route   POST /api/recipes/:id/favorite
// @access  Private
router.post('/:id/favorite', protect, [
  param('id').isMongoId().withMessage('Invalid recipe ID')
], validateRequest, async (req, res, next) => {
  try {
    const recipe = await Food.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        status: 'error',
        message: 'Recipe not found'
      });
    }

    await req.user.addFavoriteRecipe(req.params.id);

    res.json({
      status: 'success',
      message: 'Recipe added to favorites! ❤️',
      data: {
        recipe: {
          _id: recipe._id,
          name: recipe.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Remove recipe from favorites
// @route   DELETE /api/recipes/:id/favorite
// @access  Private
router.delete('/:id/favorite', protect, [
  param('id').isMongoId().withMessage('Invalid recipe ID')
], validateRequest, async (req, res, next) => {
  try {
    const recipe = await Food.findById(req.params.id);

    if (!recipe) {
      return res.status(404).json({
        status: 'error',
        message: 'Recipe not found'
      });
    }

    await req.user.removeFavoriteRecipe(req.params.id);

    res.json({
      status: 'success',
      message: 'Recipe removed from favorites',
      data: {
        recipe: {
          _id: recipe._id,
          name: recipe.name
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's favorite recipes
// @route   GET /api/recipes/favorites
// @access  Private
router.get('/favorites', protect, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], validateRequest, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id).populate({
      path: 'stats.favoriteRecipes',
      options: {
        skip,
        limit,
        sort: { createdAt: -1 }
      }
    });

    const totalFavorites = user.stats.favoriteRecipes.length;
    const totalPages = Math.ceil(totalFavorites / limit);

    res.json({
      status: 'success',
      data: {
        favoriteRecipes: user.stats.favoriteRecipes,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalFavorites,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
