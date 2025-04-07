/**
 * Main server file for MockServer
 * @module server
 */

import express from 'express';
import { initializeStore } from './expectations/expectationStore.js';
import { requestHandler } from './request-handling/requestHandler.js';
import apiRoutes from './api/routes.js';
import { logVersionInfo, logServerStarted } from './utils/logger.js';

/**
 * Express application instance for the MockServer
 * @type {import('express').Express}
 */
const app = express();

/**
 * Server port, defaults to 1080 if PORT environment variable is not set
 * @type {number}
 */
const port = process.env.PORT || 1080;

// Middleware for parsing JSON and text
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));

// Main request handler middleware
app.use(requestHandler);

// API routes for managing expectations
app.use(apiRoutes);

/**
 * Starts the MockServer
 * @returns {Promise<void>}
 */
async function startServer() {
    try {
      // Initialize the expectation store
      await initializeStore();

      // Log application version
      logVersionInfo();

      // Start listening on the configured port
      app.listen(port, () => {
          logServerStarted(port);
      });
  } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
  }
}

// Start the server
startServer();
