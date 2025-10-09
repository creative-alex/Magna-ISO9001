// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL,
  ENDPOINTS: {
    AUTH: '/auth',
    USERS: '/users',
    FILES: '/files',
    UPDATE_FIRST_LOGIN: '/users/update-first-login'
  }
};

// Other constants can be added here
export const APP_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, 
};
