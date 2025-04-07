/**
 * Persistence module for expectations
 * @module expectations/persistence
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_FILE = path.join(__dirname, '../../data/expectations.json');

/**
 * Ensures that the storage directory exists
 * @returns {Promise<void>}
 */
async function ensureStorageDirectory() {
  const storageDir = path.dirname(STORAGE_FILE);
  try {
    await fs.access(storageDir);
  } catch {
    await fs.mkdir(storageDir, { recursive: true });
  }
}

/**
 * Loads expectations from the storage file
 * @returns {Promise<Map<string, Object>>} Map of expectations by ID
 */
export async function loadExpectations() {
  try {
    await ensureStorageDirectory();
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    const expectations = JSON.parse(data);
    return new Map(expectations.map(expectation => [expectation.id, expectation]));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return new Map();
    }
    throw error;
  }
}

/**
 * Saves expectations to the storage file
 * @param {Map<string, Object>} expectations - Map of expectations by ID
 * @returns {Promise<void>}
 */
export async function saveExpectations(expectations) {
  await ensureStorageDirectory();
  const data = JSON.stringify(Array.from(expectations.values()), null, 2);
  await fs.writeFile(STORAGE_FILE, data, 'utf-8');
} 