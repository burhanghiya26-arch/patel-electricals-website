# Railway Deployment Setup Guide for Patel Electricals

## Overview
This guide provides step-by-step instructions to deploy the Patel Electricals wholesale spare parts e-commerce website on Railway.

## Prerequisites
- Railway account (https://railway.app)
- GitHub account with access to the repository
- Domain: patelspares.com

## Step 1: Create New Railway Project

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Connect your GitHub account if not already connected
5. Select the repository: `wholesale_spare_parts`
6. Select branch: `main`
7. Click "Deploy"

## Step 2: Configure Environment Variables

After the project is created, add these environment variables:

### Database Configuration
- `DATABASE_URL`: MySQL connection string (format: `mysql://user:password@host:port/database`)

### Application Configuration
- `NODE_ENV`: `production`
- `JWT_SECRET`: Your JWT signing secret (generate a random string)
- `VITE_APP_ID`: Application ID from Manus (if using)
- `OAUTH_SERVER_URL`: OAuth server URL (can be empty if not using OAuth)
- `VITE_OAUTH_PORTAL_URL`: OAuth portal URL (can be empty)

### Optional Manus Integration (if needed)
- `BUILT_IN_FORGE_API_URL`: Manus API URL
- `BUILT_IN_FORGE_API_KEY`: Manus API key
- `VITE_FRONTEND_FORGE_API_URL`: Frontend API URL
- `VITE_FRONTEND_FORGE_API_KEY`: Frontend API key

## Step 3: Configure Custom Domain

1. In Railway dashboard, go to your project settings
2. Find "Domains" section
3. Click "Add Custom Domain"
4. Enter: `patelspares.com`
5. Railway will provide DNS records
6. Update your domain registrar's DNS settings with Railway's records
7. Wait for DNS propagation (5-30 minutes)

## Step 4: Database Setup

1. Create a MySQL database (TiDB or similar)
2. Get the connection string
3. Add `DATABASE_URL` environment variable with the connection string
4. The application will automatically create tables on first run

## Step 5: Verify Deployment

1. Wait for the build to complete (5-10 minutes)
2. Check deployment logs for any errors
3. Visit https://patelspares.com
4. Verify that:
   - Home page loads correctly
   - "Customer Login" button is visible (blue)
   - "Admin Login" button is visible (black)
   - Products are displaying

## Step 6: Test Login Functionality

### Admin Login
- Email: `admin@patelelectricals.com`
- Password: `Admin@123456`

### Customer Login
- Use any email and phone number to register

## Troubleshooting

### Page shows blank/old version
- Clear Railway build cache in project settings
- Redeploy the project
- Clear browser cache (Ctrl+Shift+R)

### Database connection error
- Verify `DATABASE_URL` is correct
- Check database server is accessible
- Ensure database user has proper permissions

### Build fails
- Check build logs in Railway dashboard
- Verify all environment variables are set
- Check that the GitHub repository is accessible

### Domain not working
- Verify DNS records are correctly set
- Wait for DNS propagation (up to 30 minutes)
- Check domain registrar settings

## Important Notes

1. **Build Time**: First build may take 10-15 minutes
2. **Database**: Ensure database is accessible from Railway
3. **Environment Variables**: All required variables must be set before deployment
4. **Git Commits**: Any push to main branch will trigger automatic deployment
5. **Logs**: Check Railway deployment logs for detailed error messages

## Support

For issues or questions:
1. Check Railway documentation: https://docs.railway.app
2. Review deployment logs in Railway dashboard
3. Verify all environment variables are correctly set
4. Ensure database connection is working

## Project Structure

```
wholesale_spare_parts/
├── client/              # React frontend
│   └── src/
│       ├── pages/       # Page components
│       ├── components/  # Reusable components
│       └── App.tsx      # Main app routing
├── server/              # Express backend
│   ├── routers.ts       # tRPC procedures
│   ├── db.ts            # Database functions
│   └── _core/           # Core server setup
├── drizzle/             # Database schema
└── package.json         # Dependencies
```

## Key Features Deployed

✅ Customer Login (Email/Phone)
✅ Admin Login (Email/Password)
✅ Product Catalog
✅ Shopping Cart
✅ Guest Checkout
✅ Admin Dashboard
✅ Inventory Management
✅ Order Management
✅ WhatsApp Integration
