// Test setup do wyciszenia logów podczas testów
import { setSilentMode } from '../app/utils/logger.js';

// Włącz tryb cichy dla wszystkich testów
setSilentMode(true);

// Funkcja do tymczasowego włączenia logów w określonych testach (jeśli będzie potrzebna)
export function withLogs(testFn) {
    return async (...args) => {
        setSilentMode(false);
        try {
            await testFn(...args);
        } finally {
            setSilentMode(true);
        }
    };
} 