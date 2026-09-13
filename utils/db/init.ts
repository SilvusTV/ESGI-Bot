import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import Logger from '../Logger';
import { getSchemaPath, resolveDbPath } from './path';

export async function ensureDatabaseInitialized(): Promise<void> {
  try {
    const dbPath = resolveDbPath();
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const schemaPath = getSchemaPath();
    if (!fs.existsSync(schemaPath)) {
      Logger.warn(`Schema file not found at ${schemaPath}. Database will be created empty.`);
    }

    await new Promise<void>((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (openErr) => {
        if (openErr) {
          Logger.error(`Failed to open/create DB at ${dbPath}: ${openErr.message}`);
          reject(openErr);
          return;
        }

        const runInit = () => {
          if (!fs.existsSync(schemaPath)) {
            // Close and resolve if no schema
            db.close(() => resolve());
            return;
          }

          const sql = fs.readFileSync(schemaPath, 'utf8');
          db.exec(sql, (execErr) => {
            if (execErr) {
              Logger.error(`Failed to execute schema.sql: ${execErr.message}`);
              // Still try to close cleanly
              db.close(() => reject(execErr));
              return;
            }
            Logger.info(`Database schema ensured from ${schemaPath}`);
            db.close((closeErr) => {
              if (closeErr) {
                Logger.warn(`DB closed with warning: ${closeErr.message}`);
              }
              resolve();
            });
          });
        };

        runInit();
      });
    });
  } catch (e: any) {
    // Only log the error, do not throw (per requirement)
    Logger.error(`Database initialization error: ${e?.message || e}`);
  }
}

export default { ensureDatabaseInitialized };
