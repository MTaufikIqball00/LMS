import dotenv from 'dotenv';
dotenv.config();

export const QA_CONFIG = {
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  FLASK_URL: process.env.FLASK_SERVICE_URL || 'http://127.0.0.1:5000',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET_KEY || 'your_super_secret_jwt_key_here_change_in_production',
  HEADLESS: process.env.QA_HEADLESS !== 'false',
  SCREENSHOT_DIR: 'qa-data/screenshots',
  REPORTS_DIR: 'qa-data/reports',
  TRACES_DIR: 'qa-data/traces',
  THRESHOLDS: {
    PAGE_LOAD_MAX_MS: 3500,
    API_RESPONSE_MAX_MS: 1500,
    AI_MICROSERVICE_MAX_MS: 3000,
  }
};
