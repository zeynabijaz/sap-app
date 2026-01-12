// Backend API configuration with fallback mechanism
// Primary: Local backend (tries first)
// Fallback: Local backend (used if primary fails)

export const LOGIN_BACKEND_URL = "https://sap-app-maoe.onrender.com";

export const PRIMARY_BACKEND_URL = "http://192.168.60.104:5000";

// For mobile devices, use IP address instead of localhost
// Detect if running on mobile (Capacitor) or web
const isMobile = typeof window !== 'undefined' && window.Capacitor;

// Default fallback URL - use IP for mobile, localhost for web
// For mobile: Use your computer's local IP (e.g., http://192.168.1.100:5000)
// Find your IP: Windows: ipconfig | findstr IPv4, Mac/Linux: ifconfig or ip addr
// Current detected IP: 192.168.60.104 (update if different)
export const FALLBACK_BACKEND_URL = isMobile ? "http://192.168.60.104:5000" : "http://localhost:5000";

// Helper function to get endpoints for a given base URL
const getEndpoints = (baseUrl) => ({
  auth: `${baseUrl}/api/auth`,
  batchInfo: `${baseUrl}/api/BatchInfo`,
  migo: {
    check: `${baseUrl}/api/migo/check`,
    post: `${baseUrl}/api/migo/post`
  }
});

// Primary endpoints (Render)
export const PRIMARY_ENDPOINTS = getEndpoints(PRIMARY_BACKEND_URL);

// Fallback endpoints (Local)
export const FALLBACK_ENDPOINTS = getEndpoints(FALLBACK_BACKEND_URL);

// Local endpoints (for batch and migo - use local IP directly)
export const LOCAL_ENDPOINTS = getEndpoints(FALLBACK_BACKEND_URL);

// Default to primary (will fallback automatically on failure)
export const API_ENDPOINTS = PRIMARY_ENDPOINTS;