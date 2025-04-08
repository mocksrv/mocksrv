/**
 * Status handler for MockServer
 * @module api/handlers/statusHandler
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = join(__dirname, '../../../package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const { version } = packageJson;

/**
 * Handles PUT requests to /mockserver/status
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 */
export function statusHandler(req, res) {
  const port = process.env.NODE_PORT || process.env.PORT || 1080;
  
  const portBinding = {
    ports: [port]
  };
  
  res.status(200).json(portBinding);
} 