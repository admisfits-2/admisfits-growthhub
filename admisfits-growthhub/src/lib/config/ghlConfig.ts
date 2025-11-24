// GHL API Configuration
// Control whether to use real API or mock data

export const GHL_CONFIG = {
  // Set to true to use mock data instead of real API calls
  // This avoids CORS issues during development
  USE_MOCK_DATA: true, // Temporarily enable mock data due to token issues
  
  // Set to false to disable CORS proxy and make direct API calls
  // Only works if you have proper CORS headers or are using a backend
  USE_CORS_PROXY: true,
  
  // API endpoints configuration
  ENDPOINTS: {
    BASE_URL: 'https://services.leadconnectorhq.com',
    CALENDARS: [
      '/calendars',
      '/calendars/services',
      '/calendar/services'
    ]
  }
};

// Helper to check if we should use mock data
export const shouldUseMockData = () => {
  // Always use mock data if explicitly configured
  if (GHL_CONFIG.USE_MOCK_DATA) return true;
  
  // Don't force mock data in development - let the config decide
  // if (process.env.NODE_ENV === 'development') return true;
  
  // Use real API based on config
  return false;
};