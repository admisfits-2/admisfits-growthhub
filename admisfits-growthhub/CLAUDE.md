# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build for development environment
npm run build:dev

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

This is a React + TypeScript application built with Vite, using shadcn/ui components and Tailwind CSS for styling. The application uses Supabase for data persistence and integrates with Google Sheets and Meta Ads APIs.

### Key Technologies
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Routing**: React Router v6

### Project Structure

```
src/
├── app/api/         # API route handlers
├── components/      # React components
│   ├── ui/         # shadcn/ui components
│   ├── dashboard/  # Dashboard-specific components
│   └── auth/       # Authentication components
├── hooks/          # Custom React hooks
├── integrations/   # External service integrations
│   └── supabase/   # Supabase client and types
├── lib/            # Core libraries and services
│   ├── api/        # API client code
│   ├── config/     # Configuration files
│   └── services/   # Business logic services
└── pages/          # Page components
```

### Key Services and Integration Points

1. **Supabase Integration**
   - Client: `src/integrations/supabase/client.ts`
   - Auth hook: `src/hooks/useAuth.tsx`
   - Database migrations: `supabase/migrations/`

2. **Project Management**
   - Service: `src/lib/services/projectService.ts`
   - Metrics: `src/lib/services/projectMetricsService.ts`
   - Hooks: `src/hooks/useProjects.ts`

### Path Aliases
- `@/*` maps to `./src/*` for cleaner imports

### Development Notes

1. **Environment Setup**: Create a `.env` file based on the Quick Start Guide (`docs/QUICK_START_GUIDE.md`)
2. **TypeScript Configuration**: The project uses relaxed TypeScript settings with `noImplicitAny: false` and `strictNullChecks: false`
3. **Component Development**: When creating new components, follow the existing pattern of using shadcn/ui components from `src/components/ui/`
4. **API Integration**: External API integrations for Google Sheets and Meta Ads data
5. **State Management**: Use React Query for server state management and React hooks for local state

### Important Files
- `docs/QUICK_START_GUIDE.md` - Getting started guide
- `docs/META_ADS_INTEGRATION_GUIDE.md` - Meta Ads API setup and integration
- `docs/GOOGLE_SHEETS_SYNC_GUIDE.md` - Google Sheets sync setup for Meta Ads data
- `docs/ENVIRONMENT_SETUP.md` - Environment configuration guide