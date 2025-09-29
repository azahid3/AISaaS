const express = require('express');
const { body, query, param } = require('express-validator');
const Waitlist = require('../models/Waitlist');
const { validateRequest } = require('../middleware/validateRequest');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Join waitlist
// @route   POST /api/waitlist
// @access  Public
router.post('/', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('name').optional().isString().trim().isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('interests').optional().isArray().withMessage('Interests must be an array'),
  body('cookingExperience').optional().isIn(['beginner', 'intermediate', 'advanced']),
  body('referralSource').optional().isIn(['google', 'facebook', 'instagram', 'twitter', 'friend', 'blog', 'other'])
], validateRequest, async (req, res, next) => {
  try {
    // Check if email already exists
    const existingUser = await Waitlist.findOne({ email: req.body.email });
    
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already exists in waitlist'
      });
    }

    // Get user info from request
    const userInfo = {
      email: req.body.email,
      name: req.body.name || '',
      interests: req.body.interests || [],
      cookingExperience: req.body.cookingExperience || 'beginner',
      referralSource: req.body.referralSource || 'other',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const waitlistEntry = await Waitlist.create(userInfo);
    
    // Get total count for position
    const totalCount = await Waitlist.getTotalCount();

    res.status(201).json({
      status: 'success',
      message: 'Successfully joined the waitlist!',
      data: {
        waitlistEntry: {
          email: waitlistEntry.email,
          position: waitlistEntry.position,
          totalCount,
          estimatedWaitTime: Math.ceil(totalCount / 100) // Rough estimate
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get waitlist stats (public)
// @route   GET /api/waitlist/stats
// @access  Public
router.get('/stats', async (req, res, next) => {
  try {
    const totalCount = await Waitlist.getTotalCount();
    const stats = await Waitlist.getStats();
    
    // Calculate estimated wait time (rough estimate)
    const estimatedWaitTime = Math.ceil(totalCount / 100);

    res.json({
      status: 'success',
      data: {
        totalCount,
        estimatedWaitTime,
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get all waitlist entries (admin only)
// @route   GET /api/waitlist
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['waiting', 'invited', 'registered', 'declined']),
  query('sort').optional().isIn(['position', 'createdAt', 'email']),
  query('order').optional().isIn(['asc', 'desc'])
], validateRequest, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    // Build sort
    const sort = {};
    const sortField = req.query.sort || 'position';
    const sortOrder = req.query.order === 'desc' ? -1 : 1;
    sort[sortField] = sortOrder;

    const waitlistEntries = await Waitlist.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-ipAddress -userAgent'); // Exclude sensitive info

    const total = await Waitlist.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      data: {
        waitlistEntries,
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

// @desc    Get next users to invite
// @route   GET /api/waitlist/next
// @access  Private (Admin)
router.get('/next', protect, authorize('admin'), [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], validateRequest, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const nextUsers = await Waitlist.getNextInLine(limit);

    res.json({
      status: 'success',
      data: { nextUsers }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Invite user from waitlist
// @route   POST /api/waitlist/:id/invite
// @access  Private (Admin)
router.post('/:id/invite', protect, authorize('admin'), [
  param('id').isMongoId().withMessage('Invalid waitlist ID')
], validateRequest, async (req, res, next) => {
  try {
    const waitlistEntry = await Waitlist.findById(req.params.id);

    if (!waitlistEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'Waitlist entry not found'
      });
    }

    if (waitlistEntry.status !== 'waiting') {
      return res.status(400).json({
        status: 'error',
        message: 'User is not in waiting status'
      });
    }

    await waitlistEntry.invite();

    res.json({
      status: 'success',
      message: 'User invited successfully',
      data: { waitlistEntry }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark user as registered
// @route   POST /api/waitlist/:id/register
// @access  Private (Admin)
router.post('/:id/register', protect, authorize('admin'), [
  param('id').isMongoId().withMessage('Invalid waitlist ID')
], validateRequest, async (req, res, next) => {
  try {
    const waitlistEntry = await Waitlist.findById(req.params.id);

    if (!waitlistEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'Waitlist entry not found'
      });
    }

    await waitlistEntry.markAsRegistered();

    res.json({
      status: 'success',
      message: 'User marked as registered',
      data: { waitlistEntry }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update waitlist entry
// @route   PUT /api/waitlist/:id
// @access  Private (Admin)
router.put('/:id', protect, authorize('admin'), [
  param('id').isMongoId().withMessage('Invalid waitlist ID'),
  body('status').optional().isIn(['waiting', 'invited', 'registered', 'declined']),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], validateRequest, async (req, res, next) => {
  try {
    const waitlistEntry = await Waitlist.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!waitlistEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'Waitlist entry not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Waitlist entry updated successfully',
      data: { waitlistEntry }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete waitlist entry
// @route   DELETE /api/waitlist/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), [
  param('id').isMongoId().withMessage('Invalid waitlist ID')
], validateRequest, async (req, res, next) => {
  try {
    const waitlistEntry = await Waitlist.findByIdAndDelete(req.params.id);

    if (!waitlistEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'Waitlist entry not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Waitlist entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
