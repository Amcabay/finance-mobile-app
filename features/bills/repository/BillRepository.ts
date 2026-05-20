import { getDatabase } from '@/core/database/sqlite';
import { Bill } from '@/core/entities';

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
 * Repository handling SQLite interactions for Bills.
 * Implements offline-first CRUD capabilities with raw amounts (no masking/offset applied).
 */
export class BillRepository {
  /**
   * Adds a new bill locally inside the SQLite database.
   * Stored amount values are kept in their original raw number format.
   */
  async add(userId: string, bill: Omit<Bill, 'userId' | 'id'> & { id?: string }): Promise<Bill> {
    const db = await getDatabase();
    const id = bill.id || generateUUID();

    await db.runAsync(
      `INSERT INTO bills (
        id, user_id, name, amount, category, frequency, billing_day, active, last_generated_month, end_date, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        id,
        userId,
        bill.name,
        bill.amount,
        bill.category,
        bill.frequency,
        bill.billing_day,
        bill.active ? 1 : 0,
        bill.lastGeneratedMonth || null,
        bill.endDate || null
      ]
    );

    return {
      ...bill,
      id,
      userId,
      amount: bill.amount,
      active: bill.active
    };
  }

  /**
   * Retrieves all bills from SQLite that have not been synchronized yet (sync_status = 'pending').
   */
  async getUnsynced(): Promise<Array<Bill & { sync_status: string }>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM bills WHERE sync_status = 'pending'"
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      amount: row.amount,
      category: row.category,
      frequency: row.frequency,
      billing_day: row.billing_day,
      active: row.active === 1,
      lastGeneratedMonth: row.last_generated_month || undefined,
      endDate: row.end_date || undefined,
      sync_status: row.sync_status
    }));
  }

  /**
   * Marks a bill as successfully synchronized by updating its sync_status to 'synced'.
   */
  async markAsSynced(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE bills SET sync_status = 'synced' WHERE id = ?",
      [id]
    );
  }

  /**
   * Retrieves all local bills for a specific user.
   */
  async getBills(userId: string): Promise<Bill[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM bills WHERE user_id = ? ORDER BY billing_day ASC",
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      amount: row.amount,
      category: row.category,
      frequency: row.frequency,
      billing_day: row.billing_day,
      active: row.active === 1,
      lastGeneratedMonth: row.last_generated_month || undefined,
      endDate: row.end_date || undefined
    }));
  }
}
