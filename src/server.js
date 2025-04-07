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

const app = express();
const port = process.env.PORT || 1080;

// Middleware do obsługi JSON
app.use(express.json());

// Middleware do obsługi surowego tekstu
app.use(express.text({ type: 'text/plain' }));

// Middleware do obsługi oczekiwań
app.use(expectationMiddleware);

// Endpoint do dodawania oczekiwań - zgodny z MockServer
app.put('/mockserver/expectation', async (req, res) => {
    try {
        const expectation = req.body;
        
        // Sprawdź czy oczekiwanie ma wymagane pola
        if (!expectation.httpRequest) {
            return res.status(400).json({ error: 'Brak pola httpRequest w oczekiwaniu' });
        }
        
        // Dodajemy domyślny typ HTTP jeśli nie podano
        if (!expectation.type) {
            expectation.type = 'http';
        } else if (expectation.type !== 'http') {
            return res.status(400).json({ error: 'Nieprawidłowy typ oczekiwania. Obsługiwany jest tylko typ: http' });
        }
        
        const id = await addExpectation(expectation);
        // Zgodnie z MockServer, odpowiedź to 201 z body zawierającym oczekiwanie z ID
        res.status(201).json({ id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Zachowujemy kompatybilność z poprzednią implementacją
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

// Endpoint do resetowania (czyszczenia) wszystkich oczekiwań
app.put('/mockserver/reset', async (req, res) => {
    try {
        await clearExpectations();
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset expectations' });
    }
});

// Endpoint do pobierania wszystkich aktywnych oczekiwań
app.get('/mockserver/expectation/active', (req, res) => {
    const expectations = getAllExpectations();
    res.json(expectations);
});

// Endpoint do pobierania wszystkich oczekiwań
app.get('/mockserver/expectation', (req, res) => {
    const expectations = getAllExpectations();
    res.json(expectations);
});

// Endpoint do pobierania konkretnego oczekiwania
app.get('/mockserver/expectation/:id', (req, res) => {
    const expectation = getExpectation(req.params.id);
    if (!expectation) {
        return res.status(404).json({ error: 'Expectation not found' });
    }
    res.json(expectation);
});

// Endpoint do usuwania oczekiwań
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

// Endpoint do czyszczenia wszystkich oczekiwań
app.delete('/mockserver/expectation', async (req, res) => {
    try {
        await clearExpectations();
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear expectations' });
    }
});

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
