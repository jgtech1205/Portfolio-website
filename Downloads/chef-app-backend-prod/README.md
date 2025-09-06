# Chef en Place Backend API

A comprehensive kitchen management system API built with Node.js, Express, and MongoDB. This API provides endpoints for recipe management, user authentication, panel management, and notifications.

## 🚀 Features

- **User Authentication & Authorization**: JWT-based authentication with role-based access control
- **Recipe Management**: CRUD operations for recipes with image upload support
- **Panel Management**: Kitchen panel organization and management
- **Notification System**: Real-time notifications for users
- **Admin Dashboard**: Administrative functions and user management
- **API Documentation**: Swagger/OpenAPI documentation
- **Security**: Rate limiting, CORS, Helmet security headers
- **File Upload**: Cloudinary integration for image handling
- **Cook Role**: Read-only role with the same visibility as a chef
- **Chef Access Requests**: Chefs can request team access via `/api/chefs/request-access`

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer + Cloudinary
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, Rate Limiting
- **Deployment**: Vercel (Serverless)

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB database (local or Atlas)
- Vercel account (for deployment)
- Cloudinary account (for image uploads)

## 🚀 Quick Start

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd chefenplace-be
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   # Create .env file with your configuration
   MONGODB_URI=mongodb://localhost:27017/chef-en-place
   JWT_SECRET=your-super-secret-jwt-key
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   FRONTEND_URL=http://localhost:3000
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Seed the database** (optional):
   ```bash
   npm run seed
   ```

### Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Vercel.

## 📚 API Documentation

Once the server is running, you can access the API documentation at:
- **Swagger UI**: `http://localhost:5000/api/docs`
- **Health Check**: `http://localhost:5000/api/health`

## 🔧 Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm test` - Run tests
- `npm run seed` - Seed the database with sample data
- `npm run deploy` - Deploy to Vercel (requires Vercel CLI)

## 📁 Project Structure

```
chefenplace-be/
├── api/                 # Vercel serverless function
├── config/             # Configuration files
├── controllers/        # Route controllers
├── database/          # Database connection and models
├── middlewares/       # Express middlewares
├── routes/            # API routes
├── scripts/           # Utility scripts
├── utils/             # Utility functions
├── server.js          # Main application file
├── vercel.json        # Vercel configuration
└── package.json       # Dependencies and scripts
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Protected routes require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🗄️ Database Models

- **User**: User accounts and authentication
- **Recipe**: Recipe management with images
- **Panel**: Kitchen panel organization
- **Notification**: User notifications system

## 🔒 Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **Input Validation**: Request validation using express-validator
- **JWT Security**: Secure token-based authentication

## 📊 Monitoring & Health Checks

- `/api/health` - Basic health check
- `/api/health/detailed` - Detailed health check with database status

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   npm run deploy
   ```

3. **Set Environment Variables** in Vercel dashboard:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - Other variables as needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md).

For API documentation, visit `/api/docs` when the server is running.

## 🔗 Links

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Cloudinary](https://cloudinary.com/)
- [Express.js](https://expressjs.com/)
- [Mongoose](https://mongoosejs.com/)
