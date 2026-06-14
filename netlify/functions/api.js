require('dotenv').config();
const serverless = require('serverless-http');
const { createApp } = require('../../server/app');

const app = createApp({ serveStatic: false });
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = true;
  return handler(event, context);
};
