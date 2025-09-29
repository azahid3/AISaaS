const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  name: {
    type: String,
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  interests: [{
    type: String,
    enum: ['north-indian', 'south-indian', 'gujarati', 'punjabi', 'bengali', 'rajasthani', 'maharastrian', 'kerala', 'hyderabadi', 'street-food', 'vegetarian', 'vegan', 'quick-meals', 'traditional-recipes']
  }],
  cookingExperience: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  referralSource: {
    type: String,
    enum: ['google', 'facebook', 'instagram', 'twitter', 'friend', 'blog', 'other'],
    default: 'other'
  },
  position: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['waiting', 'invited', 'registered', 'declined'],
    default: 'waiting'
  },
  invitedAt: {
    type: Date
  },
  registeredAt: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
waitlistSchema.index({ email: 1 });
waitlistSchema.index({ status: 1 });
waitlistSchema.index({ position: 1 });
waitlistSchema.index({ createdAt: -1 });

// Virtual for wait time
waitlistSchema.virtual('waitTime').get(function() {
  if (this.status === 'waiting') {
    return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Pre-save middleware to set position
waitlistSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'waiting') {
    const count = await this.constructor.countDocuments({ status: 'waiting' });
    this.position = count + 1;
  }
  next();
});

// Static method to get waitlist stats
waitlistSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get next in line
waitlistSchema.statics.getNextInLine = function(limit = 10) {
  return this.find({ status: 'waiting' })
    .sort({ position: 1 })
    .limit(limit);
};

// Static method to get total waitlist count
waitlistSchema.statics.getTotalCount = function() {
  return this.countDocuments({ status: 'waiting' });
};

// Instance method to invite user
waitlistSchema.methods.invite = function() {
  this.status = 'invited';
  this.invitedAt = new Date();
  return this.save();
};

// Instance method to mark as registered
waitlistSchema.methods.markAsRegistered = function() {
  this.status = 'registered';
  this.registeredAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Waitlist', waitlistSchema);
