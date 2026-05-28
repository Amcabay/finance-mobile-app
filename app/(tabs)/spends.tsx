import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  SectionList,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '@/core/database/sqlite';
import { formatIDR } from '@/core/formatters/currency';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: string;
  date: string;
}

const CATEGORIES = ['Food', 'Shopping', 'Transport', 'Entertainment', 'Others'];

export default function SpendsScreen() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  const loadLocalTransactions = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC",
        ['offline-user']
      );

      if (rows && rows.length > 0) {
        setTransactions(rows.map(r => ({
          id: r.id,
          description: r.description,
          amount: Number(r.amount),
          category: r.category,
          type: r.type,
          date: r.date,
        })));
      } else {
        // Seeding awal transaksi offline default jika tabel masih kosong
        const defaultTrans = [
          { id: '1', user_id: 'offline-user', description: 'Bought lunch at Noodle House', amount: 45000, category: 'Food', type: 'expense', date: '2026-05-28' },
          { id: '2', user_id: 'offline-user', description: 'Weekly Groceries', amount: 180000, category: 'Food', type: 'expense', date: '2026-05-28' },
          { id: '3', user_id: 'offline-user', description: 'Nike Air Max Shoes', amount: 1200000, category: 'Shopping', type: 'expense', date: '2026-05-27' },
          { id: '4', user_id: 'offline-user', description: 'Ride to Office', amount: 25000, category: 'Transport', type: 'expense', date: '2026-05-26' },
          { id: '5', user_id: 'offline-user', description: 'Freelance Design Project', amount: 3500000, category: 'Income', type: 'income', date: '2026-05-25' },
        ];

        for (const t of defaultTrans) {
          await db.runAsync(
            "INSERT INTO transactions (id, user_id, description, amount, category, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [t.id, t.user_id, t.description, t.amount, t.category, t.type, t.date]
          );
        }

        setTransactions(defaultTrans.map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          category: t.category,
          type: t.type,
          date: t.date,
        })));
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocalTransactions();
  }, [loadLocalTransactions]);

  const handleAddTransaction = async () => {
    const rawAmount = parseFloat(amountInput);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter transaction name');
      return;
    }

    try {
      const db = await getDatabase();
      const newId = String(Date.now());
      const todayStr = new Date().toISOString().split('T')[0];

      await db.runAsync(
        "INSERT INTO transactions (id, user_id, description, amount, category, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [newId, 'offline-user', description, rawAmount, category, 'expense', todayStr]
      );

      setTransactions(prev => [
        {
          id: newId,
          description,
          amount: rawAmount,
          category,
          type: 'expense',
          date: todayStr,
        },
        ...prev,
      ]);

      setIsAdding(false);
      setAmountInput('');
      setDescription('');
      setCategory(CATEGORIES[0]);
    } catch (error) {
      console.error('Failed to add transaction:', error);
      Alert.alert('Error', 'Failed to save transaction');
    }
  };

  // Hitung Total Wealth secara offline
  const totalWealth = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    // Tampilkan kekayaan bersih
    return income - expense;
  }, [transactions]);

  // Filter transaksi berdasarkan query pencarian
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    return transactions.filter(t => 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transactions, searchQuery]);

  // Group transaksi berdasarkan tanggal untuk SectionList
  const sections = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      let dateLabel = t.date;
      const todayStr = new Date().toISOString().split('T')[0];
      if (t.date === todayStr) {
        dateLabel = 'Today';
      }
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(t);
    });

    return Object.keys(groups).map(date => ({
      title: date,
      data: groups[date],
    }));
  }, [filteredTransactions]);

  const getCategoryTheme = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'shopping':
        return { bg: '#FFEDD5', icon: 'cart-outline', color: '#EA580C' };
      case 'food':
        return { bg: '#F3E8FF', icon: 'fast-food-outline', color: '#9333EA' };
      case 'transport':
        return { bg: '#E0F2FE', icon: 'car-outline', color: '#0284C7' };
      default:
        return { bg: '#F1F5F9', icon: 'card-outline', color: '#64748B' };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2F95F6" />
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16 }
    ]}>
      {/* TOTAL WEALTH DISPLAY */}
      <View style={styles.wealthContainer}>
        <Text style={styles.wealthAmount}>
          {totalWealth < 0 ? '-' : ''}IDR {Math.abs(totalWealth).toLocaleString('id-ID')}
        </Text>
        <Text style={styles.wealthLabel}>Total Wealth</Text>
      </View>

      {/* INTERACTIVE LINE GRAPH MOCKUP */}
      <View style={styles.graphContainer}>
        {/* Visual Line Path and Area Fill via simple css curves */}
        <View style={styles.graphArea}>
          <View style={styles.fakeChartLine} />
          {/* Vertical grid lines */}
          <View style={[styles.gridLine, { left: '20%' }]} />
          <View style={[styles.gridLine, { left: '40%' }]} />
          <View style={[styles.gridLine, { left: '60%' }]} />
          <View style={[styles.gridLine, { left: '80%' }]} />
        </View>
        <View style={styles.xAxisRow}>
          <Text style={styles.xAxisText}>Jan 2026</Text>
          <Text style={styles.xAxisText}>Feb 2026</Text>
          <Text style={styles.xAxisText}>Mar 2026</Text>
          <Text style={styles.xAxisText}>Apr 2026</Text>
          <Text style={styles.xAxisText}>Mei 2026</Text>
        </View>
      </View>

      {/* SEARCH & FILTER BAR */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your spending"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* TRANSACTION LIST */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => {
          const theme = getCategoryTheme(item.category);
          const isExpense = item.type === 'expense';
          return (
            <View style={styles.transactionRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.categoryBadge, { backgroundColor: theme.bg }]}>
                  <Ionicons name={theme.icon as any} size={18} color={theme.color} />
                </View>
                <View style={styles.textStack}>
                  <Text style={styles.itemTitle}>{item.description}</Text>
                  <Text style={styles.itemSub}>{item.category} • Wallet</Text>
                </View>
              </View>
              <Text style={[styles.itemAmount, isExpense ? styles.expenseAmount : styles.incomeAmount]}>
                {isExpense ? '-' : '+'}IDR {item.amount.toLocaleString('id-ID')}
              </Text>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No Spends recorded yet</Text>
          </View>
        }
      />

      {/* FLOATING ACTION BUTTON (FAB) */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => setIsAdding(true)}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* NEW TRANSACTION MODAL FORM */}
      <Modal visible={isAdding} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <TouchableOpacity onPress={() => setIsAdding(false)} style={styles.backButton}>
                  <Ionicons name="chevron-back" size={20} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>New Transactions</Text>
              </View>
            </View>

            <View style={styles.modalForm}>
              {/* TRANSACTION NAME (Top Field Garis Bawah) */}
              <View style={styles.topFieldWrapper}>
                <Ionicons name="help-circle-outline" size={24} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.underlineInput}
                  placeholder="Enter transaction name"
                  placeholderTextColor="#94A3B8"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              {/* INPUT FIELDS STACK */}
              <View style={styles.fieldsStack}>
                {/* Amount Field */}
                <View style={styles.capsuleInputWrapper}>
                  <TextInput
                    style={styles.capsuleInput}
                    placeholder="Amount (IDR)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={amountInput}
                    onChangeText={setAmountInput}
                  />
                </View>

                {/* Category Dropdown/Selector Mock */}
                <View style={styles.categoriesRow}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOption,
                        category === cat && styles.catOptionActive
                      ]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.catOptionText,
                        category === cat && styles.catOptionTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* CONFIRM BUTTON */}
              <TouchableOpacity 
                style={styles.submitButton} 
                activeOpacity={0.8}
                onPress={handleAddTransaction}
              >
                <Text style={styles.submitButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  wealthContainer: {
    alignItems: 'center',
    marginVertical: 24,
    paddingTop: 12,
  },
  wealthAmount: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
  },
  wealthLabel: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  graphContainer: {
    height: 200,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  graphArea: {
    flex: 1,
    backgroundColor: '#FAF5F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fakeChartLine: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#FF4A4A',
    shadowColor: '#FF4A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  gridLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#E2E8F0',
    opacity: 0.5,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  xAxisText: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#94A3B8',
  },
  searchFilterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 13,
    color: '#1E293B',
  },
  filterButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#2F95F6',
    justifyContent: 'center',
  },
  filterButtonText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textStack: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  itemSub: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  itemAmount: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
  },
  expenseAmount: {
    color: '#EF4444',
  },
  incomeAmount: {
    color: '#10B981',
  },
  listContent: {
    paddingBottom: 100, // Margin aman agar tidak terpotong custom tab bar
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#94A3B8',
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2F95F6',
    position: 'absolute',
    bottom: 90,
    right: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2F95F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  modalTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalForm: {
    marginTop: 20,
    gap: 20,
  },
  topFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 8,
  },
  underlineInput: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 14,
    color: '#1E293B',
  },
  fieldsStack: {
    flexDirection: 'column',
    gap: 14,
  },
  capsuleInputWrapper: {
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  capsuleInput: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#1E293B',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  catOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  catOptionActive: {
    backgroundColor: '#2F95F6',
    borderColor: '#2F95F6',
  },
  catOptionText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#64748B',
  },
  catOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2F95F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
