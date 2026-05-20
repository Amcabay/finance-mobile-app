import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the open SQLite database instance.
 * Lazily opens the database connection if it doesn't exist yet.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('finance_flow.db');
  }
  return dbInstance;
}

/**
 * Initializes the database tables for budgets and bills.
 * Enables foreign key constraints.
 */
export async function initDatabase(): Promise<void> {
  const db = await getDatabase();
  
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  // Create tables for bills and budgets
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      frequency TEXT NOT NULL,
      billing_day INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      last_generated_month TEXT,
      end_date TEXT,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );
  `);
}
