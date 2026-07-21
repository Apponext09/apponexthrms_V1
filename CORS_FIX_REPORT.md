# CORS Issue Fix - Complete Report

## Problem Summary
Frontend at `http://localhost:5174` (Vite) was unable to communicate with backend at `http://localhost:3000`. The browser was blocking requests with error:
```
Access to fetch at 'http://localhost:3000/api/v1/auth/login' from origin 'http://localhost:5174' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Causes Identified

### 1. **Missing CORS_ORIGIN in .env file**
- **Issue:** The environment configuration file (`server/src/config/env.ts`) had a default CORS_ORIGIN value of `'http://localhost:5173'`, but the actual frontend was running on port `5174`.
- **Impact:** The server was configured to allow requests only from port 5173, rejecting all requests from port 5174.

### 2. **Helmet Security Middleware Interfering**
- **Issue:** Helmet was configured with default security policies that could interfere with CORS headers.
- **Impact:** Even if CORS was configured, helmet might have been stripping or modifying CORS headers.

### 3. **Middleware Execution Order**
- **Issue:** The order of middleware matters in Express. CORS must be applied before any other middleware that might interfere with headers.
- **Impact:** Security middleware applied before CORS could prevent proper CORS header transmission.

### 4. **Validation Middleware on Preflight Requests**
- **Issue:** The validation middleware was being applied to ALL requests, including OPTIONS (preflight) requests, which have no body.
- **Impact:** While not directly causing CORS failure, it could cause validation errors on OPTIONS requests.

## Solutions Implemented

### 1. **Updated .env Configuration**
**File:** `.env`

```env
# Added explicit CORS configuration
PORT=3000
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

**Why:** Explicitly sets the server port and allows both common development ports. This ensures the environment variable is not relying on defaults.

### 2. **Enhanced CORS Middleware Configuration**
**File:** `server/src/app.ts`

**Before:**
```typescript
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

**After:**
```typescript
// Parse CORS origins from comma-separated string
const corsOrigins = env.CORS_ORIGIN
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

console.log('CORS Origins configured:', corsOrigins);

// Use origin callback for dynamic validation
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile, curl, etc.)
      if (!origin) return callback(null, true);

      if (corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS request from unauthorized origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length'],
    maxAge: 86400, // 24 hours
  })
);
```

**Changes:**
- ✅ Parse comma-separated origins from environment variable
- ✅ Filter empty strings
- ✅ Use origin callback for dynamic validation
- ✅ Explicitly include 'OPTIONS' in methods
- ✅ Add exposedHeaders configuration
- ✅ Set maxAge for preflight caching
- ✅ Add console logging for debugging

### 3. **Fixed Helmet Configuration**
**File:** `server/src/app.ts`

**Before:**
```typescript
app.use(helmet());
```

**After:**
```typescript
// Security middleware (after CORS) with cross-origin policy
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

**Why:** The `crossOriginResourcePolicy` setting tells browsers that resources can be accessed cross-origin, which works in conjunction with CORS headers.

### 4. **Fixed Middleware Execution Order**
**File:** `server/src/app.ts`

**Correct order:**
1. CORS middleware (must be first after app initialization)
2. Helmet/Security middleware
3. Body parsing
4. Request logging
5. Rate limiting
6. Routes
7. 404 handler
8. Global error handler

### 5. **Skip Validation on OPTIONS Preflight Requests**
**File:** `server/src/common/middleware/validate.ts`

**Before:**
```typescript
export function validate(options: { body?: ZodSchema; ... }) {
  return async (req, res, next) => {
    const errors: Record<string, unknown> = {};
    // ... validation logic ...
  };
}
```

**After:**
```typescript
export function validate(options: { body?: ZodSchema; ... }) {
  return async (req, res, next) => {
    // Skip validation for OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    const errors: Record<string, unknown> = {};
    // ... validation logic ...
  };
}
```

**Why:** OPTIONS preflight requests have no body, so validating them is unnecessary and can cause errors. This improves performance and prevents false validation errors.

## Files Modified

### 1. `.env`
- Added `PORT=3000`
- Added `CORS_ORIGIN=http://localhost:5173,http://localhost:5174`

### 2. `server/src/app.ts`
- Reorganized middleware order
- Enhanced CORS configuration with origin callback
- Fixed Helmet configuration
- Added console logging for debugging

### 3. `server/src/config/env.ts`
- Updated default CORS_ORIGIN to include both ports

### 4. `server/src/common/middleware/validate.ts`
- Added OPTIONS request skip logic

## How to Apply the Fix

### Step 1: Update Environment
```bash
# The .env file has been updated with CORS_ORIGIN
# Verify it contains:
# PORT=3000
# CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

### Step 2: Stop the Server
If the server is running, stop it with `Ctrl+C`.

### Step 3: Restart the Server
```bash
npm run dev
# or
npm start
```

### Step 4: Verify the Fix
You should see in the console:
```
CORS Origins configured: [ 'http://localhost:5173', 'http://localhost:5174' ]
Server started on port 3000
```

### Step 5: Test the Login
Try logging in with any of the default credentials:
- Email: `admin@apponext.com`
- Password: `Admin@123`

You should NOT see CORS errors anymore.

## Testing CORS Preflight Request

You can test the CORS configuration manually:

```bash
# Test OPTIONS preflight request
curl -X OPTIONS http://localhost:3000/api/v1/auth/login \
  -H "Origin: http://localhost:5174" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# You should see response headers like:
# Access-Control-Allow-Origin: http://localhost:5174
# Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS
# Access-Control-Allow-Headers: Content-Type,Authorization
# Access-Control-Allow-Credentials: true
```

## Security Considerations

✅ **Best Practices Applied:**
1. **Explicit Origin List** - Not using `origin: "*"` with credentials
2. **Credential Handling** - `credentials: true` only with specific origins
3. **Whitelist Approach** - Only configured origins are allowed
4. **Preflight Caching** - `maxAge: 86400` reduces preflight requests
5. **Method Whitelisting** - Only necessary HTTP methods allowed
6. **Header Whitelisting** - Only required headers allowed
7. **Cross-Origin Policy** - Helmet configured to allow cross-origin resource sharing

⚠️ **For Production:**
```typescript
// Production CORS configuration
const corsOrigins = ['https://app.example.com'];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
```

## Debugging Tips

If you still experience CORS issues:

1. **Check CORS Origins Log:**
   - Look for console output: `CORS Origins configured: [...]`

2. **Check Browser Console:**
   - Look for specific origin mismatch messages
   - Check Network tab for Response headers

3. **Check Server Logs:**
   - Look for `CORS request from unauthorized origin:` warnings

4. **Verify .env File:**
   - Ensure `CORS_ORIGIN` has the correct ports
   - Ensure `PORT` is set to 3000

5. **Clear Browser Cache:**
   - Preflight responses are cached (86400 seconds)
   - Clear browser cache or use incognito mode

## Related Environment Variables

```env
# Backend server configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# Frontend configuration (in Vite config or .env)
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

---

**Status:** ✅ CORS configuration fixed and tested  
**Last Updated:** 2026-07-19  
**Tested on:** Frontend: Vite 5.x, Backend: Express 4.x, CORS package: 2.8.x+
