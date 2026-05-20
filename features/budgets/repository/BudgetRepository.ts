import { getDatabase } from '@/core/database/sqlite';
import { Budget } from '@/core/entities';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Repository handling SQLite interactions for Budgets.
 * Implements offline-first CRUD capabilities with raw amounts (no masking/offset applied).
 */
export class BudgetRepository {
  /**
   * Adds or updates a budget locally inside the SQLite database.
   * Stored amount values are kept in their original raw number format.
   */
  async add(userId: string, budget: Omit<Budget, 'userId' | 'id'> & { id?: string }): Promise<Budget> {
    const db = await getDatabase();
    const id = budget.id || generateUUID();

    await db.runAsync(
      `INSERT INTO budgets (
        id, user_id, category, amount, month, sync_status
      ) VALUES (?, ?, ?, ?, ?, 'pending')
      ON CONFLICT(id) DO UPDATE SET
        category = excluded.category,
        amount = excluded.amount,
        month = excluded.month,
        sync_status = 'pending'`,
      [
        id,
        userId,
        budget.category,
        budget.amount,
        budget.month
      ]
    );

    return {
      ...budget,
      id,
      userId,
      amount: budget.amount
    };
  }

  /**
   * Retrieves all budgets from SQLite that have not been synchronized yet (sync_status = 'pending').
   */
  async getUnsynced(): Promise<Array<Budget & { sync_status: string }>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM budgets WHERE sync_status = 'pending'"
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      category: row.category,
      amount: row.amount,
      month: row.month,
      sync_status: row.sync_status
    }));
  }

  /**
   * Marks a budget as successfully synchronized by updating its sync_status to 'synced'.
   */
  async markAsSynced(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE budgets SET sync_status = 'synced' WHERE id = ?",
      [id]
    );
  }

  /**
   * Retrieves all local budgets for a specific user and month.
   */
  async getBudgets(userId: string, month: string): Promise<Budget[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM budgets WHERE user_id = ? AND month = ? ORDER BY category ASC",
      [userId, month]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      category: row.category,
      amount: row.amount,
      month: row.month
    }));
  }
}
