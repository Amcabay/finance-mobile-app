# Technical Specification and Functional Requirements

This document defines the architecture, database schema, and transaction integrity protocols for Finance Flow Mobile. It serves as the primary technical onboarding specification for engineering personnel.

## 1. Architectural Coupling and State Matrix

The application operates as an offline-first financial logging system with client-side state synchronization. 

*   **Offline-First Data Model:** All persistent data resides locally within a structured SQLite database initialized and accessed via the `expo-sqlite` API.
*   **State Persistence & Event Synchronization:** To prevent divergence of data representations across separate router tabs, state persistence must not rely on volatile React component memory or localized hook states. The application mandates a reactive architecture where view layers bind to database-driven event triggers (such as `useFocusEffect` combined with active transactional hooks). Any mutation of the underlying database must dispatch global event signals, forcing all active UI components to re-query the SQLite ledger, thereby maintaining multi-tab synchronization.

## 2. Database Data Dictionary

The persistent layer is defined by three primary relational tables. The schemas are configured to enforce domain integrity, datatype constraint safety, and foreign key relationships.

### 2.1 Table: `accounts`
Stores the localized asset balances (wallets) allocated to the user.
*   `id`: `INTEGER` (PRIMARY KEY, AUTOINCREMENT)
*   `name`: `TEXT` (NOT NULL)
*   `icon`: `TEXT` (NOT NULL)
*   `balance`: `REAL` (NOT NULL, DEFAULT 0.0)
*   `type`: `TEXT` (NOT NULL, e.g., 'Cash', 'Bank')

### 2.2 Table: `transactions`
Logs individual income and outcome events linked to specific wallets.
*   `id`: `INTEGER` (PRIMARY KEY, AUTOINCREMENT)
*   `amount`: `REAL` (NOT NULL)
*   `category`: `TEXT` (NOT NULL)
*   `type`: `TEXT` (NOT NULL, CHECK (type IN ('income', 'expense')))
*   `account_id`: `INTEGER` (NOT NULL, FOREIGN KEY REFERENCES accounts(id) ON DELETE CASCADE)
*   `description`: `TEXT` (NULLABLE)
*   `date`: `TEXT` (NOT NULL, formatted as ISO 8601 string: YYYY-MM-DD)

### 2.3 Table: `bills`
Maintains records of ongoing monthly subscriptions and long-term installments.
*   `id`: `INTEGER` (PRIMARY KEY, AUTOINCREMENT)
*   `name`: `TEXT` (NOT NULL)
*   `amount`: `REAL` (NOT NULL)
*   `bill_type`: `TEXT` (NOT NULL, CHECK (bill_type IN ('subscription', 'installment')))
*   `current_tenor`: `INTEGER` (NULLABLE, utilized for installment tracking)
*   `total_tenor`: `INTEGER` (NULLABLE, utilized for installment tracking)
*   `payment_history`: `TEXT` (NOT NULL, DEFAULT '', stores delimited chronological payment records)
*   `billing_day`: `INTEGER` (NOT NULL, CHECK (billing_day >= 1 AND billing_day <= 31))
*   `status`: `TEXT` (NOT NULL, e.g., 'active', 'paid', 'overdue')
*   `account_id`: `INTEGER` (NOT NULL, FOREIGN KEY REFERENCES accounts(id) ON DELETE RESTRICT)

## 3. Logical Mutation Protocols and Data Integrity Guards

To ensure transaction reliability and prevent database inconsistency, all mutations must adhere to the following logical rules.

### 3.1 Reverse Mutation on Deletion
When a record is deleted from the `transactions` table, the system must maintain account balance integrity by executing an inverse balance update on the linked account. This operation must occur within a single database transaction block:
*   If the deleted transaction `type` is 'expense', the wallet balance must be incremented:
    `UPDATE accounts SET balance = balance + ? WHERE id = ?;`
*   If the deleted transaction `type` is 'income', the wallet balance must be decremented:
    `UPDATE accounts SET balance = balance - ? WHERE id = ?;`

### 3.2 Self-Healing State Guard
To resolve visual ghost balance phenomena caused by transaction synchronization latencies, the system implements automated ledger sanitization logic during the initialization of the Dashboard and Wallet Selector interfaces:
*   First, execute: `SELECT COUNT(*) as count FROM transactions;`
*   If the returned integer is exactly `0`, the system must immediately trigger an automated database sanitization query:
    `UPDATE accounts SET balance = 0;`
*   This corrective statement must complete resolution before local state hooks are updated or the ledger is queried for UI population.

### 3.3 Recurring Timeline Tokenization
For simplified tracking of bill payments without the overhead of additional relational tables, installment history is serialized directly within the `bills.payment_history` field as a delimited string.
*   When a bill is marked as paid, the system appends the payment date (formatted as YYYY-MM-DD) to the existing `payment_history` string.
*   The system uses the triple-pipe delimiter (`|||`) as the split-token mechanism (e.g., `2026-04-01|||2026-05-01|||2026-06-01`).
*   During view-layer rendering, the application splits this string by `|||` to compute paid timelines and construct horizontal step-progress charts.

### 3.4 Currency Sanitization Mask
To facilitate visual scannability, input fields mask numerical entries with thousands separators in real-time.
*   Before database parameters are committed, the sanitization pipeline must parse input strings to extract the clean float representation.
*   The visual masking pattern is stripped of all separator characters using a regular expression match (`/\./g`) to guarantee numeric precision prior to SQLite query execution.
