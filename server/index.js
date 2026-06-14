require('dotenv').config();
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Lost & Found server http://localhost:${PORT}`);
});
