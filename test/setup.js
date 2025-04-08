// Test setup do wyciszenia logów podczas testów
import { setSilentMode, enableSilentMode } from '../app/utils/logger.js';
import { test } from 'node:test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { clearRequestHistory } from '../app/api/handlers/retrieveHandler.js';
import { initializeStore, disablePersistence } from '../app/expectations/expectationStore.js';

// Tworzymy tymczasowy katalog dla testów
const testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mocksrv-test-'));
process.env.MOCKSRV_DATA_DIR = path.join(testTmpDir, 'data');
process.env.MOCKSRV_EXPECTATIONS_PATH = path.join(process.env.MOCKSRV_DATA_DIR, 'expectations.json');

// Bardzo ważne - ustawiamy również zmienną środowiskową używaną przez serwer
process.env.MOCKSERVER_PERSISTED_EXPECTATIONS_PATH = process.env.MOCKSRV_EXPECTATIONS_PATH;

// Wyłączamy persystencję na czas testów, aby nie modyfikować plików
process.env.MOCKSERVER_PERSIST_EXPECTATIONS = 'false';

// Utworzenie katalogu danych testowych
fs.mkdirSync(process.env.MOCKSRV_DATA_DIR, { recursive: true });

// Wycisz logger przed uruchomieniem testów
enableSilentMode();

// Włącz tryb cichy dla wszystkich testów
setSilentMode(true);

// Wyłącz persystencję oczekiwań, żeby nie zapisywać do plików
disablePersistence();

// Inicjalizacja store z czystą konfiguracją
initializeStore();

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

// Czyszczenie tymczasowego katalogu po zakończeniu testów
process.on('exit', () => {
  try {
    fs.rmSync(testTmpDir, { recursive: true, force: true });
  } catch (err) {
    console.error('Błąd przy czyszczeniu katalogu testowego:', err);
  }
});

// Kod uruchamiany przed testem
test('test/setup.js', (t) => {
  t.beforeEach(async () => {
    // Czyścimy historię requestów i expectation store przed każdym testem
    clearRequestHistory();
    await initializeStore();
  });

  t.afterEach(() => {
    // Kod wykonywany po każdym teście
  });
}); 