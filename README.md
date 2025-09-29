# 🍽️ Khaana AI - Desi Cooking Assistant

A modern, AI-powered cooking assistant that helps you create authentic desi recipes with personalized recommendations, smart ingredient matching, and step-by-step guidance.

## ✨ Features

### 🎨 Beautiful Landing Page
- **Orange + Desi Themed Design** with warm, spicy, and authentic colors
- **Floating Food Slider** showcasing different types of desi foods
- **Interactive Chat Interface** mockup with Gen Z vibes
- **Responsive Design** for all devices
- **Smooth Animations** and modern UI/UX

### 🤖 AI-Powered Features
- **Personalized Recipe Recommendations** based on preferences
- **Smart Ingredient Matching** - find recipes with available ingredients
- **Step-by-Step Cooking Guidance** with traditional tips
- **Dietary Preference Filtering** (vegetarian, vegan, gluten-free, etc.)
- **Spice Level Customization** (mild, medium, hot, extra-hot)

### 📱 User Experience
- **User Authentication** with JWT tokens
- **Profile Management** with cooking experience tracking
- **Favorite Recipes** and saved collections
- **Cooking Streak** and achievement system
- **Waitlist Management** for early access

## 🏗️ Architecture

### Frontend
- **HTML5** with semantic markup
- **CSS3** with modern features (Grid, Flexbox, Animations)
- **Vanilla JavaScript** with ES6+ features
- **Responsive Design** with mobile-first approach
- **Progressive Enhancement** for better performance

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT Authentication** for secure user sessions
- **RESTful API** with comprehensive endpoints
- **Input Validation** with express-validator
- **Error Handling** with custom middleware
- **Rate Limiting** for API protection

### AWS Infrastructure
- **EC2** instances with Auto Scaling Groups
- **Application Load Balancer** for high availability
- **S3** for static asset storage
- **CloudFront** for global content delivery
- **DocumentDB** for managed MongoDB
- **CloudFormation** for infrastructure as code

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (or MongoDB Atlas)
- AWS CLI (for deployment)
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd AISaaS
   ```

2. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend
   npm install
   
   # Frontend (if using build tools)
   cd ..
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp backend/env.example backend/.env
   
   # Edit .env with your configuration
   nano backend/.env
   ```

4. **Start the development server**
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend (open index.html in browser)
   open index.html
   ```

### AWS Deployment

1. **Configure AWS CLI**
   ```bash
   aws configure
   ```

2. **Run deployment script**
   ```bash
   chmod +x aws/deploy.sh
   ./aws/deploy.sh
   ```

3. **Access your application**
   - Check `DEPLOYMENT_SUMMARY.md` for URLs and next steps

## 📁 Project Structure

```
AISaaS/
├── index.html              # Main landing page
├── styles.css              # Frontend styles
├── script.js               # Frontend JavaScript
├── README.md               # Project documentation
├── .gitignore              # Git ignore rules
├── backend/                # Backend application
│   ├── server.js           # Express server
│   ├── package.json        # Backend dependencies
│   ├── config/             # Configuration files
│   │   └── database.js     # MongoDB connection
│   ├── models/             # Database models
│   │   ├── User.js         # User model
│   │   ├── Food.js         # Food/Recipe model
│   │   └── Waitlist.js     # Waitlist model
│   ├── routes/             # API routes
│   │   ├── auth.js         # Authentication routes
│   │   ├── users.js        # User management
│   │   ├── foods.js        # Food/Recipe endpoints
│   │   ├── recipes.js      # Recipe recommendations
│   │   └── waitlist.js     # Waitlist management
│   ├── middleware/         # Custom middleware
│   │   ├── auth.js         # Authentication middleware
│   │   ├── errorHandler.js # Error handling
│   │   └── validateRequest.js # Input validation
│   └── scripts/            # Utility scripts
│       ├── migrate.js      # Database migrations
│       └── seed.js         # Database seeding
└── aws/                    # AWS deployment
    ├── cloudformation-template.yaml # Infrastructure template
    └── deploy.sh           # Deployment script
```

## 🎨 Design System

### Color Palette
- **Primary (Saffron Orange):** #F37A20
- **Accent (Deep Red/Chili):** #C03527  
- **Secondary (Turmeric Yellow):** #F4B731
- **Dark Base (Charcoal Black):** #1A1A1A
- **Neutral (Cream/Beige):** #FFF4E6
- **Highlight Green (Mint/Herbs):** #4CAF50

### Typography
- **Font Family:** Inter (Google Fonts)
- **Weights:** 300, 400, 500, 600, 700

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Foods & Recipes
- `GET /api/foods` - Get all foods with filtering
- `GET /api/foods/featured` - Get featured foods
- `GET /api/foods/:id` - Get food by ID
- `POST /api/recipes/recommendations` - Get personalized recommendations
- `POST /api/recipes/by-ingredients` - Find recipes by ingredients

### Waitlist
- `POST /api/waitlist` - Join waitlist
- `GET /api/waitlist/stats` - Get waitlist statistics

## 🛠️ Development

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test locally
3. Commit changes: `git commit -m "Add new feature"`
4. Push to remote: `git push origin feature/new-feature`
5. Create pull request

### Database Migrations
```bash
cd backend
npm run migrate
```

### Seeding Database
```bash
cd backend
npm run seed
```

## 🚀 Deployment

### Manual Deployment
1. Build the application
2. Upload to S3 bucket
3. Update CloudFront distribution
4. Deploy backend to EC2 instances

### Automated Deployment
```bash
./aws/deploy.sh
```

## 📊 Monitoring

### Health Checks
- **Backend Health:** `GET /health`
- **Database Connection:** Automatic monitoring
- **Load Balancer:** Health checks on port 3000

### Logs
- **Application Logs:** CloudWatch Logs
- **Access Logs:** Load Balancer logs
- **Error Logs:** Application error tracking

## 🔒 Security

### Authentication
- JWT tokens with expiration
- Password hashing with bcrypt
- Rate limiting on API endpoints

### Data Protection
- Input validation and sanitization
- MongoDB injection prevention
- CORS configuration
- Helmet.js security headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Design Inspiration:** Traditional Indian cooking and modern UI/UX
- **Icons:** Font Awesome
- **Fonts:** Google Fonts (Inter)
- **Colors:** Inspired by Indian spices and traditional elements

## 📞 Support

For support, email support@khaana-ai.com or create an issue in the repository.

---

**Made with ❤️ for the desi cooking community**