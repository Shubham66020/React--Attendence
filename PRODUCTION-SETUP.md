# Production Setup Instructions

## Running Frontend and Backend on Single Port (5000)

This application is configured to serve both the React frontend and Express backend on port 5000 in production.

### Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

2. **Set up environment variables:**
   - Update the `.env` file in the root directory:
     - For local development: `VITE_SERVER_URL=http://localhost:5000`
     - For production: `VITE_SERVER_URL=https://react-attendence.onrender.com`
   - Copy `server/.env.example` to `server/.env`
   - Update the MongoDB connection string and other settings as needed

3. **Start production server:**
   ```bash
   npm run production
   ```

   Or alternatively:
   ```bash
   npm run start
   ```

### Available Scripts

- `npm run production` - Builds frontend and starts production server
- `npm run start` - Full build and start (installs dependencies first)
- `npm run serve` - Quick build and start (assumes dependencies are installed)
- `npm run dev:full` - Development mode (frontend on 5173, backend on 5000)

### How it Works

1. **Build Process**: The frontend React app is built using Vite and outputs to the `dist/` directory
2. **Static Serving**: The Express server serves the built React app from the `dist/` directory
3. **API Routes**: All API endpoints are prefixed with `/api/` and handled by Express
4. **Client-Side Routing**: All non-API routes are served the React app's `index.html` for client-side routing
5. **Single Port**: Both frontend and backend run on port 5000

### Production URL Structure

- Frontend: `http://localhost:5000/`
- API Health Check: `http://localhost:5000/api/health`
- All API endpoints: `http://localhost:5000/api/*`

### Environment Variables

**Frontend (.env):**
- `VITE_SERVER_URL` - Server URL for API calls
  - Development: `http://localhost:5000`
  - Production: `https://react-attendence.onrender.com`

**Backend (server/.env):**
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - A secure secret for JWT tokens
- `PORT` - Server port (defaults to 5000)
- `NODE_ENV` - Set to 'production' for production builds

### Switching Between Development and Production

To switch from localhost to production URL:

1. Open the `.env` file in the root directory
2. Comment out the localhost line and uncomment the production line:
   ```bash
   # For local development:
   # VITE_SERVER_URL=http://localhost:5000
   
   # For production deployment:
   VITE_SERVER_URL=https://react-attendence.onrender.com
   ```
3. Rebuild the frontend: `npm run build`
4. Restart the server: `npm run serve`
