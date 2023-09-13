/* eslint-disable brace-style */
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

require('./utils/client').setupClient();
