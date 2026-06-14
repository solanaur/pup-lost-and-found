require('dotenv').config();
const serverless = require('serverless-http');
const { createApp } = require('../../server/app');

const app = createApp({ serveStatic: false });
module.exports.handler = serverless(app);
