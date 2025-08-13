# Chef en Place Backend - Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **MongoDB Database**: Set up a MongoDB database (MongoDB Atlas recommended)
3. **Cloudinary Account**: For image uploads (optional but recommended)

## Environment Variables Setup

Before deploying, you'll need to set up the following environment variables in Vercel:

### Required Variables:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string for JWT token signing
- `NODE_ENV`: Set to `production`

### Optional Variables:
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Your Cloudinary API key
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
- `FRONTEND_URL`: Your frontend URL for CORS
- `JWT_EXPIRE`: JWT token expiration (default: 30d)
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window (default: 900000ms)
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window (default: 100)

## Deployment Steps

### Method 1: Using Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set Environment Variables**:
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   # Add other variables as needed
   ```

### Method 2: Using Vercel Dashboard

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Connect Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your repository

3. **Configure Project**:
   - Framework Preset: `Node.js`
   - Root Directory: `./` (or leave empty)
   - Build Command: Leave empty (not needed for this setup)
   - Output Directory: Leave empty
   - Install Command: `npm install`

4. **Set Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add all required variables listed above

5. **Deploy**:
   - Click "Deploy"

## Post-Deployment

### 1. Test Your API
Your API will be available at: `https://your-project-name.vercel.app`

Test the health endpoint:
```bash
curl https://your-project-name.vercel.app/api/health
```

### 2. API Documentation
Access Swagger docs at: `https://your-project-name.vercel.app/api/docs`

### 3. Database Setup
If you haven't already, run the database seed script:
```bash
npm run seed
```

## Important Notes

### Serverless Limitations
- **Cold Starts**: Vercel uses serverless functions, so there may be cold start delays
- **Request Timeout**: Functions have a 10-second timeout limit
- **Memory**: Limited to 1024MB per function

### Database Considerations
- Use MongoDB Atlas for production (recommended)
- Ensure your database connection string is accessible from Vercel's servers
- Consider connection pooling for better performance

### File Uploads
- For file uploads, consider using Cloudinary or similar services
- Vercel's serverless functions have limitations for file handling

## Troubleshooting

### Common Issues:

1. **Database Connection Errors**:
   - Check your `MONGODB_URI` environment variable
   - Ensure your database is accessible from external IPs

2. **CORS Errors**:
   - Set the `FRONTEND_URL` environment variable correctly
   - Update the CORS configuration in `server.js` if needed

3. **JWT Errors**:
   - Ensure `JWT_SECRET` is set and is a secure random string

4. **Rate Limiting**:
   - Adjust rate limiting settings if needed for your use case

### Monitoring
- Use Vercel's built-in analytics and monitoring
- Check function logs in the Vercel dashboard
- Monitor database connections and performance

## Local Development

To run locally with the same configuration:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your local values
   ```

3. **Run the server**:
   ```bash
   npm run dev
   ```

## Support

For issues with:
- **Vercel Deployment**: Check Vercel documentation and community
- **Database**: Refer to MongoDB Atlas documentation
- **API Issues**: Check the logs in Vercel dashboard 