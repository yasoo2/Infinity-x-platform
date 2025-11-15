// dashboard-x/src/config.js
const config = {
  development: {
    apiBaseUrl: 'http://localhost:4000/api/v1',
    wsBaseUrl: 'ws://localhost:4000',
  },
  production: {
    apiBaseUrl: 'https://api.xelitesolutions.com/api/v1',
    wsBaseUrl: 'wss://api.xelitesolutions.com',
  },
};

const env = import.meta.env.MODE === 'production' ? 'production' : 'development';
export default config[env];
