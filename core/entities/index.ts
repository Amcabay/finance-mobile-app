export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: TransactionType;
}

export interface Summary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
}

export type InvestmentType = 'stock' | 'crypto' | 'stake';

export interface Investment {
  id: string;
  name: string;
  symbol: string;
  type: InvestmentType;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  date: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  month: string; // Format: YYYY-MM
}

export type BillFrequency = 'monthly' | 'yearly';

export interface Bill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  frequency: BillFrequency;
  billing_day: number; // 1-31
  active: boolean;
  lastGeneratedMonth?: string; // YYYY-MM to prevent duplicate generation
  endDate?: string; // Format: YYYY-MM-DD
  account_id?: string;
  bill_type?: 'subscription' | 'installment';
  payment_history?: string;
  current_tenor?: number;
  total_tenor?: number;
}
