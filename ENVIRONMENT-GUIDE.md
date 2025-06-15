# Environment Configuration Guide

## Overview

This application uses a centralized environment variable `VITE_SERVER_URL` to configure the server URL for all API calls. This makes it easy to switch between development (localhost) and production (Render.com) environments.

## Environment Variable

The `VITE_SERVER_URL` variable is defined in the `.env` file at the root of the project and is used throughout the application via the `SERVER_URL` constant exported from `src/config/api.ts`.

## Current Setup

### Files Using SERVER_URL:
- `src/pages/Attendance.tsx`
- `src/pages/Employees.tsx` 
- `src/pages/Reports.tsx`
- `src/contexts/AuthContext.tsx` (via API_ENDPOINTS)

### Configuration File:
- `src/config/api.ts` - Exports `SERVER_URL` and `API_ENDPOINTS`

## How to Switch Environments

### Method 1: Using NPM Scripts (Recommended)

```bash
# Switch to development (localhost:5000)
npm run env:dev

# Switch to production (https://react-attendence.onrender.com)
npm run env:prod
```

After switching, you need to rebuild:
```bash
npm run build
npm run serve
```

### Method 2: Manual Editing

Edit the `.env` file and comment/uncomment the appropriate lines:

**For Development:**
```bash
# For local development:
VITE_SERVER_URL=http://localhost:5000

# For production deployment (uncomment the line below and comment the line above):
# VITE_SERVER_URL=https://react-attendence.onrender.com
```

**For Production:**
```bash
# For local development:
# VITE_SERVER_URL=http://localhost:5000

# For production deployment (uncomment the line below and comment the line above):
VITE_SERVER_URL=https://react-attendence.onrender.com
```

## Complete Workflow

### For Local Development:
```bash
npm run env:dev
npm run build
npm run serve
```

### For Production Deployment:
```bash
npm run env:prod
npm run build
npm run serve
```

## API Endpoints

All API calls automatically use the configured `VITE_SERVER_URL`:

- Authentication: `${SERVER_URL}/api/auth/*`
- Attendance: `${SERVER_URL}/api/attendance/*` 
- Employees: `${SERVER_URL}/api/employees/*`

## Important Notes

1. **Always rebuild** after changing the environment variable
2. The environment variable is resolved at **build time**, not runtime
3. All pages now use the centralized `SERVER_URL` constant
4. The server automatically serves both frontend and backend on the same port (5000)
