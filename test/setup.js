import { setSilentMode, enableSilentMode } from '../app/utils/logger.js';
import { test } from 'node:test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { clearRequestHistory } from '../app/api/handlers/retrieveHandler.js';
import { initializeStore, disablePersistence } from '../app/expectations/expectationStore.js';


const testTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mocksrv-test-'));
process.env.MOCKSRV_DATA_DIR = path.join(testTmpDir, 'data');
process.env.MOCKSRV_EXPECTATIONS_PATH = path.join(process.env.MOCKSRV_DATA_DIR, 'expectations.json');


process.env.MOCKSERVER_PERSISTED_EXPECTATIONS_PATH = process.env.MOCKSRV_EXPECTATIONS_PATH;


process.env.MOCKSERVER_PERSIST_EXPECTATIONS = 'false';


fs.mkdirSync(process.env.MOCKSRV_DATA_DIR, { recursive: true });


enableSilentMode();


setSilentMode(true);


disablePersistence();


initializeStore();


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


process.on('exit', () => {
  try {
    fs.rmSync(testTmpDir, { recursive: true, force: true });
  } catch (err) {
    console.error('Błąd przy czyszczeniu katalogu testowego:', err);
  }
});


test('test/setup.js', (t) => {
  t.beforeEach(async () => {
    
    clearRequestHistory();
    await initializeStore();
  });

  t.afterEach(() => {
    
  });
}); 