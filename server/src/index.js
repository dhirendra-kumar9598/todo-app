import mongoose from 'mongoose';
import { createApp, parseOrigins } from './app.js';
import { connectDB } from './config/db.js';

const PORT = Number(process.env.PORT) || 4000;

// In production the API must only accept requests from the deployed frontend.
if (process.env.NODE_ENV === 'production' && parseOrigins(process.env.CORS_ORIGIN) === '*') {
  console.error('CORS_ORIGIN must be set to the frontend origin(s) in production, e.g. https://my-app.netlify.app');
  process.exit(1);
}

try {
  await connectDB(process.env.MONGODB_URI);
} catch (err) {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
}

const server = createApp().listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
