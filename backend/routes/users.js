const express = require('express');
const { param, query } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');

const router = express.Router();

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('role').optional().isIn(['user', 'admin', 'chef']),
  query('isActive').optional().isBoolean()
], validateRequest, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const users = await User.find(filter)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      data: {
        users,
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

// @desc    Get top cooks
// @route   GET /api/users/top-cooks
// @access  Public
router.get('/top-cooks', [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], validateRequest, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const topCooks = await User.getTopCooks(limit);

    res.json({
      status: 'success',
      data: { topCooks }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, [
  param('id').isMongoId().withMessage('Invalid user ID')
], validateRequest, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Only allow users to see their own profile or admin to see any profile
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to view this profile'
      });
    }

    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user role (admin only)
// @route   PUT /api/users/:id/role
// @access  Private (Admin)
router.put('/:id/role', protect, authorize('admin'), [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('role').isIn(['user', 'admin', 'chef']).withMessage('Invalid role')
], validateRequest, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'User role updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Toggle user active status (admin only)
// @route   PUT /api/users/:id/status
// @access  Private (Admin)
router.put('/:id/status', protect, authorize('admin'), [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], validateRequest, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true, runValidators: true }
    ).select('-password -emailVerificationToken -passwordResetToken -passwordResetExpires');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: `User ${req.body.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), [
  param('id').isMongoId().withMessage('Invalid user ID')
], validateRequest, async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
