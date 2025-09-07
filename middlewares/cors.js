// Manual CORS handling - completely custom implementation
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
  
  // Production frontend URLs
  'https://chef-frontend-psi.vercel.app',
  'https://chef-frontend-eta.vercel.app',
  'https://chefenplace-psi.vercel.app',
  'https://chef-frontend.vercel.app',
  'https://chef-en-place.vercel.app',
  
  // Production backend URLs
  'https://chef-app-backend.vercel.app',
  'https://chef-app-backend-rho.vercel.app',
  'https://chef-app-be.vercel.app',
  'https://chef-backend.vercel.app',
  
  // Vercel preview URLs (for testing)
  'https://chef-app-backend-git-backend-main-jgtech1205s-projects.vercel.app',
  'https://chef-app-backend-rcdcbokxj-jgtech1205s-projects.vercel.app'
];

// Function to check if origin is a valid Chef en Place domain
const isValidChefDomain = (origin) => {
  if (!origin) return false;
  
  // Check for Chef en Place related domains
  const chefDomains = [
    'chef-frontend',
    'chef-app-backend', 
    'chef-backend',
    'chef-en-place',
    'chefenplace'
  ];
  
  return chefDomains.some(domain => origin.includes(domain)) && origin.includes('.vercel.app');
};

// Main CORS middleware function
const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const method = req.method;
  
  console.log(`🌐 CORS Request: ${method} ${req.path} from origin: ${origin}`);
  
  // Always allow requests with no origin (like mobile apps or curl requests)
  if (!origin) {
    console.log('✅ CORS: Allowing request with no origin');
    return next();
  }
  
  // Check if origin is allowed (exact match or valid Chef domain)
  const isAllowedOrigin = allowedOrigins.includes(origin) || isValidChefDomain(origin);
  
  if (!isAllowedOrigin) {
    console.log(`❌ CORS: Blocking origin: ${origin}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed',
      origin: origin,
      allowedOrigins: allowedOrigins
    });
  }
  
  // Set CORS headers for all requests
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight OPTIONS requests
  if (method === 'OPTIONS') {
    console.log('🔄 CORS: Handling preflight OPTIONS request');
    
    // Set additional headers for preflight
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, stripe-signature, Accept, Origin');
    res.header('Access-Control-Max-Age', '86400');
    
    // End preflight request with 200 status
    return res.status(200).end();
  }
  
  console.log(`✅ CORS: Allowing ${method} request from ${origin}`);
  next();
};

// Specific CORS handler for Stripe endpoints
const stripeCorsHandler = (req, res, next) => {
  const origin = req.headers.origin;
  const method = req.method;
  
  console.log(`💳 Stripe CORS: ${method} ${req.path} from origin: ${origin}`);
  
  // Always allow Stripe webhook requests (they come from Stripe servers)
  if (req.path.includes('/webhook')) {
    console.log('✅ Stripe webhook request - allowing');
    return next();
  }
  
  // For all other Stripe endpoints, use the same logic as main CORS
  if (!origin) {
    console.log('✅ Stripe CORS: Allowing request with no origin');
    return next();
  }
  
  const isAllowedOrigin = allowedOrigins.includes(origin) || isValidChefDomain(origin);
  
  if (!isAllowedOrigin) {
    console.log(`❌ Stripe CORS: Blocking origin: ${origin}`);
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed for Stripe endpoints',
      origin: origin
    });
  }
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight for Stripe endpoints
  if (method === 'OPTIONS') {
    console.log('🔄 Stripe CORS: Handling preflight OPTIONS request');
    
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, stripe-signature, Accept, Origin');
    res.header('Access-Control-Max-Age', '86400');
    
    return res.status(200).end();
  }
  
  console.log(`✅ Stripe CORS: Allowing ${method} request from ${origin}`);
  next();
};

// Global OPTIONS handler for all routes
const globalOptionsHandler = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    
    console.log(`🔄 Global OPTIONS handler: ${req.path} from origin: ${origin}`);
    
    // Set CORS headers for any OPTIONS request
    if (origin && (allowedOrigins.includes(origin) || isValidChefDomain(origin))) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, stripe-signature, Accept, Origin');
    res.header('Access-Control-Max-Age', '86400');
    
    return res.status(200).end();
  }
  
  next();
};

module.exports = {
  corsMiddleware,
  stripeCorsHandler,
  globalOptionsHandler,
  allowedOrigins
};
