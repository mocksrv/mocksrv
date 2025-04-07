import express from 'express';
import { 
    addExpectation, 
    getAllExpectations, 
    getExpectation, 
    removeExpectation, 
    clearExpectations,
    initializeStore
} from './store/expectationStore.js';
import { expectationMiddleware } from './middleware/expectationMiddleware.js';
import { logVersionInfo, logServerStarted } from './utils/logger.js';

/**
 * Express application instance for the MockServer
 * @type {import('express').Express}
 */
const app = express();

/**
 * Server port number, defaults to 1080 if PORT environment variable is not set
 * @type {number}
 */
const port = process.env.PORT || 1080;

app.use(express.json());

app.use(express.text({ type: 'text/plain' }));

app.use(expectationMiddleware);

/**
 * Creates a new expectation via PUT method
 * @route PUT /mockserver/expectation
 * @param {Object} req.body - The expectation configuration
 * @param {Object} req.body.httpRequest - The HTTP request to match
 * @param {string} [req.body.type=http] - The type of expectation
 * @returns {Object} The created expectation ID
 */
app.put('/mockserver/expectation', async (req, res) => {
    try {
        const expectation = req.body;

        if (!expectation.httpRequest) {
            return res.status(400).json({ error: 'Brak pola httpRequest w oczekiwaniu' });
        }

        if (!expectation.type) {
            expectation.type = 'http';
        } else if (expectation.type !== 'http') {
            return res.status(400).json({ error: 'Nieprawidłowy typ oczekiwania. Obsługiwany jest tylko typ: http' });
        }
        
        const id = await addExpectation(expectation);

        res.status(201).json({ id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Creates a new expectation via POST method
 * @route POST /mockserver/expectation
 * @param {Object} req.body - The expectation configuration
 * @param {Object} req.body.httpRequest - The HTTP request to match
 * @param {string} [req.body.type=http] - The type of expectation
 * @returns {Object} The created expectation ID
 */
app.post('/mockserver/expectation', async (req, res) => {
    try {
        const expectation = req.body;
        
        if (!expectation.httpRequest) {
            return res.status(400).json({ error: 'Brak pola httpRequest w oczekiwaniu' });
        }
        
        if (!expectation.type) {
            expectation.type = 'http';
        } else if (expectation.type !== 'http') {
            return res.status(400).json({ error: 'Nieprawidłowy typ oczekiwania. Obsługiwany jest tylko typ: http' });
        }
        
        const id = await addExpectation(expectation);
        res.status(201).json({ id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Resets all expectations
 * @route PUT /mockserver/reset
 * @returns {void}
 */
app.put('/mockserver/reset', async (req, res) => {
    try {
        await clearExpectations();
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset expectations' });
    }
});

/**
 * Gets all active expectations
 * @route GET /mockserver/expectation/active
 * @returns {Array<Object>} List of all active expectations
 */
app.get('/mockserver/expectation/active', (req, res) => {
    const expectations = getAllExpectations();
    res.json(expectations);
});

/**
 * Gets all expectations
 * @route GET /mockserver/expectation
 * @returns {Array<Object>} List of all expectations
 */
app.get('/mockserver/expectation', (req, res) => {
    const expectations = getAllExpectations();
    res.json(expectations);
});

/**
 * Gets a specific expectation by ID
 * @route GET /mockserver/expectation/:id
 * @param {string} req.params.id - The expectation ID
 * @returns {Object} The expectation object
 */
app.get('/mockserver/expectation/:id', (req, res) => {
    const expectation = getExpectation(req.params.id);
    if (!expectation) {
        return res.status(404).json({ error: 'Expectation not found' });
    }
    res.json(expectation);
});

/**
 * Deletes a specific expectation
 * @route DELETE /mockserver/expectation/:id
 * @param {string} req.params.id - The expectation ID to delete
 * @returns {void}
 */
app.delete('/mockserver/expectation/:id', async (req, res) => {
    try {
        const deleted = await removeExpectation(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Expectation not found' });
        }
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove expectation' });
    }
});

/**
 * Deletes all expectations
 * @route DELETE /mockserver/expectation
 * @returns {void}
 */
app.delete('/mockserver/expectation', async (req, res) => {
    try {
        await clearExpectations();
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear expectations' });
    }
});

/**
 * Starts the MockServer
 * Initializes the expectation store and starts listening on the configured port
 * @returns {Promise<void>}
 */
async function startServer() {
    try {
        await initializeStore();
        logVersionInfo();
        app.listen(port, () => {
            logServerStarted(port);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
