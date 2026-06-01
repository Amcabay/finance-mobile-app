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
 * Initializes the database tables for accounts, budgets, bills, and transactions.
 * Enables foreign key constraints and runs safe column migrations using PRAGMA.
 */
export async function initDatabase(): Promise<void> {
  const db = await getDatabase();
  
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  // Create tables for accounts, budgets, bills, and transactions
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      account_id TEXT
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
      sync_status TEXT NOT NULL DEFAULT 'pending',
      account_id TEXT,
      bill_type TEXT DEFAULT 'subscription',
      payment_history TEXT,
      current_tenor INTEGER DEFAULT 0,
      total_tenor INTEGER DEFAULT 12
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      account_id TEXT
    );
  `);

  // Robust column migration via PRAGMA
  try {
    const cols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(transactions);");
    const hasAccountId = cols && cols.some(col => col.name === 'account_id');
    if (!hasAccountId) {
      await db.execAsync("ALTER TABLE transactions ADD COLUMN account_id TEXT;");
      console.log('✅ Migrated transactions table: added account_id');
    }
  } catch (error) {
    console.error('Failed to migrate transactions table:', error);
  }

  try {
    const cols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(budgets);");
    const hasAccountId = cols && cols.some(col => col.name === 'account_id');
    if (!hasAccountId) {
      await db.execAsync("ALTER TABLE budgets ADD COLUMN account_id TEXT;");
      console.log('✅ Migrated budgets table: added account_id');
    }
  } catch (error) {
    console.error('Failed to migrate budgets table:', error);
  }

  try {
    const cols = await db.getAllAsync<{ name: string }>("PRAGMA table_info(bills);");
    const hasAccountId = cols && cols.some(col => col.name === 'account_id');
    if (!hasAccountId) {
      await db.execAsync("ALTER TABLE bills ADD COLUMN account_id TEXT;");
      console.log('✅ Migrated bills table: added account_id');
    }

    const hasBillType = cols && cols.some(col => col.name === 'bill_type');
    if (!hasBillType) {
      await db.execAsync("ALTER TABLE bills ADD COLUMN bill_type TEXT DEFAULT 'subscription';");
      await db.execAsync("ALTER TABLE bills ADD COLUMN payment_history TEXT;");
      await db.execAsync("ALTER TABLE bills ADD COLUMN current_tenor INTEGER DEFAULT 0;");
      await db.execAsync("ALTER TABLE bills ADD COLUMN total_tenor INTEGER DEFAULT 12;");
      console.log('✅ Migrated bills table: added bill_type, payment_history, current_tenor, total_tenor');
    }
  } catch (error) {
    console.error('Failed to migrate bills table:', error);
  }

  // Seed default accounts inside an atomic transaction block if empty
  try {
    const accountsCount = await db.getAllAsync<{ count: number }>('SELECT COUNT(*) as count FROM accounts;');
    if (accountsCount && accountsCount[0] && accountsCount[0].count === 0) {
      await db.withTransactionAsync(async () => {
        await db.runAsync("INSERT INTO accounts (id, name, type, balance) VALUES ('acc-cash', 'Cash', 'Cash', 0);");
        await db.runAsync("INSERT INTO accounts (id, name, type, balance) VALUES ('acc-bank', 'Bank', 'Bank', 0);");
      });
      console.log('✅ Seeded default Cash and Bank accounts in transaction successfully');
    }
  } catch (error) {
    console.error('Failed to seed default accounts inside transaction:', error);
  }
}
