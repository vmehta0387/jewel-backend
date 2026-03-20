const path = require('path');
const dotenv = require('dotenv');
const { expo } = require('./app.json');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '');

if (!apiBaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_API_BASE_URL in mobile/.env');
}

module.exports = {
  ...expo,
  extra: {
    ...expo.extra,
    apiBaseUrl,
  },
}; 
