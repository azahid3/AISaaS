const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Food name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Food name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Food description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Food category is required'],
    enum: {
      values: ['main-course', 'appetizer', 'dessert', 'beverage', 'snack', 'bread', 'curry', 'rice'],
      message: 'Category must be one of: main-course, appetizer, dessert, beverage, snack, bread, curry, rice'
    }
  },
  cuisine: {
    type: String,
    required: [true, 'Cuisine type is required'],
    enum: {
      values: ['north-indian', 'south-indian', 'gujarati', 'punjabi', 'bengali', 'rajasthani', 'maharastrian', 'kerala', 'hyderabadi', 'street-food'],
      message: 'Invalid cuisine type'
    }
  },
  difficulty: {
    type: String,
    required: [true, 'Difficulty level is required'],
    enum: {
      values: ['easy', 'medium', 'hard'],
      message: 'Difficulty must be easy, medium, or hard'
    }
  },
  prepTime: {
    type: Number,
    required: [true, 'Preparation time is required'],
    min: [1, 'Preparation time must be at least 1 minute']
  },
  cookTime: {
    type: Number,
    required: [true, 'Cooking time is required'],
    min: [1, 'Cooking time must be at least 1 minute']
  },
  servings: {
    type: Number,
    required: [true, 'Number of servings is required'],
    min: [1, 'Servings must be at least 1']
  },
  ingredients: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: String,
      required: true,
      trim: true
    },
    unit: {
      type: String,
      required: true,
      trim: true
    }
  }],
  instructions: [{
    step: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    tips: {
      type: String,
      trim: true
    }
  }],
  nutrition: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  imageUrl: {
    type: String,
    default: ''
  },
  backgroundGradient: {
    type: String,
    default: ''
  },
  popularity: {
    type: Number,
    default: 0,
    min: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  isVegetarian: {
    type: Boolean,
    default: false
  },
  isVegan: {
    type: Boolean,
    default: false
  },
  isGlutenFree: {
    type: Boolean,
    default: false
  },
  spiceLevel: {
    type: String,
    enum: ['mild', 'medium', 'hot', 'extra-hot'],
    default: 'medium'
  },
  featured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
foodSchema.index({ name: 'text', description: 'text', tags: 'text' });
foodSchema.index({ category: 1 });
foodSchema.index({ cuisine: 1 });
foodSchema.index({ difficulty: 1 });
foodSchema.index({ featured: 1 });
foodSchema.index({ popularity: -1 });
foodSchema.index({ 'rating.average': -1 });

// Virtual for total time
foodSchema.virtual('totalTime').get(function() {
  return this.prepTime + this.cookTime;
});

// Virtual for difficulty display
foodSchema.virtual('difficultyDisplay').get(function() {
  const difficultyMap = {
    'easy': 'Beginner',
    'medium': 'Intermediate', 
    'hard': 'Advanced'
  };
  return difficultyMap[this.difficulty] || this.difficulty;
});

// Pre-save middleware
foodSchema.pre('save', function(next) {
  // Convert tags to lowercase
  if (this.tags && this.tags.length > 0) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim());
  }
  next();
});

// Static method to get featured foods
foodSchema.statics.getFeatured = function() {
  return this.find({ featured: true }).sort({ popularity: -1 });
};

// Static method to search foods
foodSchema.statics.searchFoods = function(query, filters = {}) {
  const searchQuery = {
    $text: { $search: query }
  };
  
  // Add filters
  if (filters.category) searchQuery.category = filters.category;
  if (filters.cuisine) searchQuery.cuisine = filters.cuisine;
  if (filters.difficulty) searchQuery.difficulty = filters.difficulty;
  if (filters.isVegetarian !== undefined) searchQuery.isVegetarian = filters.isVegetarian;
  if (filters.spiceLevel) searchQuery.spiceLevel = filters.spiceLevel;
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Food', foodSchema);
