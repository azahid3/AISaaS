const express = require('express');
const { body, query, param } = require('express-validator');
const Food = require('../models/Food');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

// @desc    Get all foods with filtering and pagination
// @route   GET /api/foods
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isIn(['main-course', 'appetizer', 'dessert', 'beverage', 'snack', 'bread', 'curry', 'rice']),
  query('cuisine').optional().isIn(['north-indian', 'south-indian', 'gujarati', 'punjabi', 'bengali', 'rajasthani', 'maharastrian', 'kerala', 'hyderabadi', 'street-food']),
  query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  query('isVegetarian').optional().isBoolean(),
  query('spiceLevel').optional().isIn(['mild', 'medium', 'hot', 'extra-hot']),
  query('search').optional().isString().trim(),
  query('sort').optional().isIn(['name', 'popularity', 'rating', 'createdAt', 'totalTime']),
  query('order').optional().isIn(['asc', 'desc'])
], validateRequest, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    if (req.query.category) filter.category = req.query.category;
    if (req.query.cuisine) filter.cuisine = req.query.cuisine;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.isVegetarian !== undefined) filter.isVegetarian = req.query.isVegetarian === 'true';
    if (req.query.spiceLevel) filter.spiceLevel = req.query.spiceLevel;

    // Build sort object
    const sort = {};
    const sortField = req.query.sort || 'popularity';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;
    sort[sortField] = sortOrder;

    let foods;
    let total;

    if (req.query.search) {
      // Text search
      const searchQuery = {
        $text: { $search: req.query.search },
        ...filter
      };
      
      foods = await Food.find(searchQuery, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, ...sort })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name profile.avatar');
        
      total = await Food.countDocuments(searchQuery);
    } else {
      foods = await Food.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name profile.avatar');
        
      total = await Food.countDocuments(filter);
    }

    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      data: {
        foods,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
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

// @desc    Get featured foods
// @route   GET /api/foods/featured
// @access  Public
router.get('/featured', async (req, res, next) => {
  try {
    const foods = await Food.getFeatured()
      .limit(8)
      .populate('createdBy', 'name profile.avatar');

    res.json({
      status: 'success',
      data: { foods }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get food by ID
// @route   GET /api/foods/:id
// @access  Public
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid food ID')
], validateRequest, async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id)
      .populate('createdBy', 'name profile.avatar');

    if (!food) {
      return res.status(404).json({
        status: 'error',
        message: 'Food not found'
      });
    }

    // Increment popularity
    food.popularity += 1;
    await food.save();

    res.json({
      status: 'success',
      data: { food }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create new food
// @route   POST /api/foods
// @access  Private (Admin/Chef)
router.post('/', protect, [
  body('name').notEmpty().withMessage('Food name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').isIn(['main-course', 'appetizer', 'dessert', 'beverage', 'snack', 'bread', 'curry', 'rice']),
  body('cuisine').isIn(['north-indian', 'south-indian', 'gujarati', 'punjabi', 'bengali', 'rajasthani', 'maharastrian', 'kerala', 'hyderabadi', 'street-food']),
  body('difficulty').isIn(['easy', 'medium', 'hard']),
  body('prepTime').isInt({ min: 1 }).withMessage('Preparation time must be a positive integer'),
  body('cookTime').isInt({ min: 1 }).withMessage('Cooking time must be a positive integer'),
  body('servings').isInt({ min: 1 }).withMessage('Servings must be a positive integer'),
  body('ingredients').isArray({ min: 1 }).withMessage('At least one ingredient is required'),
  body('instructions').isArray({ min: 1 }).withMessage('At least one instruction is required')
], validateRequest, async (req, res, next) => {
  try {
    const foodData = {
      ...req.body,
      createdBy: req.user._id
    };

    const food = await Food.create(foodData);

    res.status(201).json({
      status: 'success',
      data: { food }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update food
// @route   PUT /api/foods/:id
// @access  Private (Admin/Chef)
router.put('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid food ID')
], validateRequest, async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        status: 'error',
        message: 'Food not found'
      });
    }

    // Check if user is authorized to update
    if (req.user.role !== 'admin' && food.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this food'
      });
    }

    const updatedFood = await Food.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name profile.avatar');

    res.json({
      status: 'success',
      data: { food: updatedFood }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete food
// @route   DELETE /api/foods/:id
// @access  Private (Admin)
router.delete('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid food ID')
], validateRequest, async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        status: 'error',
        message: 'Food not found'
      });
    }

    // Only admin can delete
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this food'
      });
    }

    await Food.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Food deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Rate food
// @route   POST /api/foods/:id/rate
// @access  Private
router.post('/:id/rate', protect, [
  param('id').isMongoId().withMessage('Invalid food ID'),
  body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
], validateRequest, async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        status: 'error',
        message: 'Food not found'
      });
    }

    // Update rating (simplified - in production, you'd want to track individual user ratings)
    const newRating = req.body.rating;
    const currentAverage = food.rating.average;
    const currentCount = food.rating.count;
    
    const newAverage = ((currentAverage * currentCount) + newRating) / (currentCount + 1);
    
    food.rating.average = Math.round(newAverage * 10) / 10; // Round to 1 decimal
    food.rating.count += 1;
    
    await food.save();

    res.json({
      status: 'success',
      data: { 
        food: {
          _id: food._id,
          name: food.name,
          rating: food.rating
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
