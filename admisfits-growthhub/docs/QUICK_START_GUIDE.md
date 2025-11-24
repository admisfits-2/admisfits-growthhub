# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Create Environment File
Create a `.env` file in your project root (same folder as `package.json`) with:

```bash
# Supabase Configuration (required for data persistence)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google OAuth Configuration (for Google Sheets integration)
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback

# Meta Ads Configuration (for Meta Ads integration)
VITE_META_APP_ID=your_meta_app_id_here
VITE_META_APP_SECRET=your_meta_app_secret_here
VITE_META_REDIRECT_URI=http://localhost:5173/auth/meta/callback
```

### Step 3: Start Development
```bash
npm run dev
```

## ✨ Features

- **Project Management**: Create and manage marketing projects
- **Dashboard Metrics**: Track key performance indicators
- **Google Sheets Integration**: Sync data with Google Sheets
- **Meta Ads Integration**: Connect to Facebook/Meta advertising data
- **Responsive Design**: Works on desktop and mobile

## 📚 Next Steps

1. **Set up Supabase**: Configure your database backend
2. **Connect Google Sheets**: Set up data synchronization
3. **Configure Meta Ads**: Connect your advertising accounts
4. **Customize Metrics**: Configure your dashboard metrics

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## 📖 Documentation

- [Environment Setup Guide](./ENVIRONMENT_SETUP.md)
- [Google Sheets Integration](./GOOGLE_SHEETS_SYNC_GUIDE.md)
- [Meta Ads Integration](./META_ADS_INTEGRATION_GUIDE.md)
- [Data Integration Strategy](./DATA_INTEGRATION_STRATEGY.md)