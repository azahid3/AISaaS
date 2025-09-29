const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'chef'],
    default: 'user'
  },
  profile: {
    avatar: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      maxlength: [200, 'Bio cannot exceed 200 characters']
    },
    location: {
      type: String,
      trim: true
    },
    cookingExperience: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'professional'],
      default: 'beginner'
    },
    dietaryPreferences: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'halal']
    }],
    favoriteCuisines: [{
      type: String,
      enum: ['north-indian', 'south-indian', 'gujarati', 'punjabi', 'bengali', 'rajasthani', 'maharastrian', 'kerala', 'hyderabadi', 'street-food']
    }]
  },
  preferences: {
    spiceLevel: {
      type: String,
      enum: ['mild', 'medium', 'hot', 'extra-hot'],
      default: 'medium'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      weeklyRecipes: {
        type: Boolean,
        default: true
      }
    }
  },
  stats: {
    recipesCooked: {
      type: Number,
      default: 0
    },
    favoriteRecipes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food'
    }],
    savedRecipes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food'
    }],
    cookingStreak: {
      type: Number,
      default: 0
    },
    lastCooked: {
      type: Date
    }
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ 'profile.cookingExperience': 1 });
userSchema.index({ 'stats.recipesCooked': -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Instance method to add favorite recipe
userSchema.methods.addFavoriteRecipe = function(recipeId) {
  if (!this.stats.favoriteRecipes.includes(recipeId)) {
    this.stats.favoriteRecipes.push(recipeId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove favorite recipe
userSchema.methods.removeFavoriteRecipe = function(recipeId) {
  this.stats.favoriteRecipes = this.stats.favoriteRecipes.filter(
    id => id.toString() !== recipeId.toString()
  );
  return this.save();
};

// Instance method to increment cooking streak
userSchema.methods.incrementCookingStreak = function() {
  const today = new Date();
  const lastCooked = this.stats.lastCooked;
  
  if (!lastCooked) {
    this.stats.cookingStreak = 1;
  } else {
    const daysDiff = Math.floor((today - lastCooked) / (1000 * 60 * 60 * 24));
    if (daysDiff === 1) {
      this.stats.cookingStreak += 1;
    } else if (daysDiff > 1) {
      this.stats.cookingStreak = 1;
    }
  }
  
  this.stats.lastCooked = today;
  this.stats.recipesCooked += 1;
  return this.save();
};

// Static method to get top cooks
userSchema.statics.getTopCooks = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'stats.recipesCooked': -1 })
    .limit(limit)
    .select('name profile.avatar stats.recipesCooked stats.cookingStreak');
};

module.exports = mongoose.model('User', userSchema);
