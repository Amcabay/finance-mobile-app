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
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { getDatabase } from '@/core/database/sqlite';
import { formatIDR } from '@/core/formatters/currency';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40; // padding horizontal 20 + 20
const chartHeight = 160;

interface Transaction {
  id: string;
  description: string; // Stored as "Name|||Description"
  amount: number;
  category: string;
  type: string;
  date: string;
  account_id?: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food', icon: 'fast-food-outline', color: '#FF7A7A' },
  { id: 'shopping', label: 'Shopping', icon: 'shirt-outline', color: '#FFB067' },
  { id: 'transport', label: 'Transport', icon: 'car-sport-outline', color: '#52B6FF' },
  { id: 'entertainment', label: 'Entertainment', icon: 'game-controller-outline', color: '#B39DDB' },
  { id: 'bills', label: 'Bills', icon: 'receipt-outline', color: '#46CDCF' },
  { id: 'groceries', label: 'Groceries', icon: 'basket-outline', color: '#81C784' },
  { id: 'health', label: 'Health', icon: 'medical-outline', color: '#FF8AAB' },
  { id: 'education', label: 'Education', icon: 'book-outline', color: '#A1887F' },
  { id: 'investment', label: 'Investment', icon: 'trending-up-outline', color: '#4DB6AC' },
  { id: 'others', label: 'Others', icon: 'options-outline', color: '#90A4AE' },
];

const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', icon: 'cash-outline', color: '#81C784' },
  { id: 'investment', label: 'Investment', icon: 'trending-up-outline', color: '#4DB6AC' },
  { id: 'freelance', label: 'Freelance', icon: 'briefcase-outline', color: '#FFB067' },
  { id: 'others', label: 'Others', icon: 'help-outline', color: '#90A4AE' },
];

const CATEGORIES = EXPENSE_CATEGORIES;

export default function SpendsScreen() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Action States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedMenuTransaction, setSelectedMenuTransaction] = useState<Transaction | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  
  // Filter States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterTime, setFilterTime] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSort, setFilterSort] = useState<'newest' | 'oldest' | 'highest'>('newest');

  // Temporary States inside Filter Sheet (applied only on pressing "Apply")
  const [tempTime, setTempTime] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [tempCategory, setTempCategory] = useState<string>('all');
  const [tempSort, setTempSort] = useState<'newest' | 'oldest' | 'highest'>('newest');

  // Form Input States
  const [amountInput, setAmountInput] = useState('');
  const [transactionName, setTransactionName] = useState('');
  const [extraDescription, setExtraDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<typeof EXPENSE_CATEGORIES[0] | null>(null);

  // Multi-wallet account states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('acc-cash');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');

  const categoriesList = useMemo(() => {
    return transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  }, [transactionType]);

  const loadAccounts = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>("SELECT * FROM accounts");
      if (rows) {
        setAccounts(rows.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          balance: Number(r.balance),
        })));
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  }, []);

  const loadLocalTransactions = useCallback(async () => {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC",
        ['offline-user']
      );

      if (rows) {
        setTransactions(rows.map(r => ({
          id: r.id,
          description: r.description,
          amount: Number(r.amount),
          category: r.category,
          type: r.type,
          date: r.date,
          account_id: r.account_id || 'acc-cash',
        })));
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLocalTransactions();
      loadAccounts();
    }, [loadLocalTransactions, loadAccounts])
  );

  const getCategoryDetails = (catName: string) => {
    const combined = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
    const match = combined.find(
      c => c.id === catName.toLowerCase() || c.label.toLowerCase() === catName.toLowerCase()
    );
    return match || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]; // Fallback to Others
  };

  const formatThousandsSeparator = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) return '';
    return Number(cleanValue).toLocaleString('id-ID');
  };

  const handleConfirmTransaction = async () => {
    const cleanAmountStr = amountInput.replace(/\./g, '');
    const rawAmount = parseFloat(cleanAmountStr);
    if (isNaN(rawAmount) || rawAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!transactionName.trim()) {
      Alert.alert('Error', 'Please enter transaction name');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category by tapping the question mark circle');
      return;
    }

    const combinedDescription = `${transactionName.trim()}|||${extraDescription.trim()}`;

    try {
      const db = await getDatabase();
      const todayStr = new Date().toISOString().split('T')[0];

      if (editingTransactionId) {
        await db.runAsync(
          `UPDATE transactions SET 
            description = ?, 
            amount = ?, 
            category = ?, 
            date = ?,
            account_id = ?,
            type = ?
          WHERE id = ?`,
          [combinedDescription, rawAmount, selectedCategory.label, todayStr, selectedAccountId, transactionType, editingTransactionId]
        );
      } else {
        const newId = String(Date.now());
        // Insert transaction with dynamic type and account_id
        await db.runAsync(
          "INSERT INTO transactions (id, user_id, description, amount, category, type, date, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [newId, 'offline-user', combinedDescription, rawAmount, selectedCategory.label, transactionType, todayStr, selectedAccountId]
        );
        // Reconcile/Deduct account balance
        if (transactionType === 'expense') {
          await db.runAsync(
            "UPDATE accounts SET balance = balance - ? WHERE id = ?",
            [rawAmount, selectedAccountId]
          );
        } else {
          await db.runAsync(
            "UPDATE accounts SET balance = balance + ? WHERE id = ?",
            [rawAmount, selectedAccountId]
          );
        }
      }

      loadLocalTransactions();
      loadAccounts();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      Alert.alert('Error', 'Failed to save transaction');
    }
  };

  const initiateEdit = () => {
    if (!selectedMenuTransaction) return;
    
    const parts = selectedMenuTransaction.description.split('|||');
    const name = parts[0];
    const extra = parts[1] || '';

    setEditingTransactionId(selectedMenuTransaction.id);
    setTransactionName(name);
    setAmountInput(formatThousandsSeparator(String(selectedMenuTransaction.amount)));
    setExtraDescription(extra);

    const catDetails = getCategoryDetails(selectedMenuTransaction.category);
    setSelectedCategory(catDetails);
    setSelectedAccountId(selectedMenuTransaction.account_id || 'acc-cash');
    setTransactionType(selectedMenuTransaction.type === 'income' ? 'income' : 'expense');
    
    setIsMenuOpen(false);
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedMenuTransaction) return;

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete this transaction?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const amountVal = selectedMenuTransaction.amount;
              const accountId = selectedMenuTransaction.account_id || 'acc-cash';
              const type = selectedMenuTransaction.type;

              await db.withTransactionAsync(async () => {
                // Reverse transaction balance effect on target wallet account
                if (type === 'expense') {
                  await db.runAsync(
                    "UPDATE accounts SET balance = balance + ? WHERE id = ?",
                    [amountVal, accountId]
                  );
                } else {
                  await db.runAsync(
                    "UPDATE accounts SET balance = balance - ? WHERE id = ?",
                    [amountVal, accountId]
                  );
                }
                
                // Now delete the transaction cleanly
                await db.runAsync("DELETE FROM transactions WHERE id = ?", [selectedMenuTransaction.id]);
              });

              setIsMenuOpen(false);
              setSelectedMenuTransaction(null);
              await loadLocalTransactions();
              await loadAccounts(); // Refresh accounts as well
            } catch (error) {
              console.error('Failed to delete transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setEditingTransactionId(null);
    setTransactionName('');
    setAmountInput('');
    setExtraDescription('');
    setSelectedCategory(null);
    setIsCategoryPickerOpen(false);
    setSelectedAccountId('acc-cash');
    setTransactionType('expense');
  };

  const openFilterModal = () => {
    setTempTime(filterTime);
    setTempCategory(filterCategory);
    setTempSort(filterSort);
    setIsFilterModalOpen(true);
  };

  const applyFilters = () => {
    setFilterTime(tempTime);
    setFilterCategory(tempCategory);
    setFilterSort(tempSort);
    setIsFilterModalOpen(false);
  };

  const resetFilters = () => {
    setTempTime('all');
    setTempCategory('all');
    setTempSort('newest');
  };

  // LOGIKA PENYARINGAN DATA (REAL-TIME FILTERING)
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => {
        const parts = t.description.split('|||');
        const name = parts[0];
        const extra = parts[1] || '';
        return (
          name.toLowerCase().includes(q) ||
          extra.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      });
    }

    // 2. Time Range Filter
    if (filterTime !== 'all') {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      result = result.filter(t => {
        const tDate = new Date(t.date);
        
        if (filterTime === 'today') {
          return t.date === todayStr;
        } else if (filterTime === 'week') {
          const diffTime = Math.abs(now.getTime() - tDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        } else if (filterTime === 'month') {
          return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // 3. Category Filter
    if (filterCategory !== 'all') {
      result = result.filter(t => {
        const catDetails = getCategoryDetails(t.category);
        return catDetails.id === filterCategory.toLowerCase();
      });
    }

    // 4. Sorting Rules
    if (filterSort === 'newest') {
      result.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    } else if (filterSort === 'oldest') {
      result.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    } else if (filterSort === 'highest') {
      result.sort((a, b) => b.amount - a.amount);
    }

    return result;
  }, [transactions, searchQuery, filterTime, filterCategory, filterSort]);

  // Group filtered transactions by date for SectionList
  const sections = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredAndSortedTransactions.forEach(t => {
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
  }, [filteredAndSortedTransactions]);

  // Hitung Total Wealth dinamis dari transaksi yang disaring
  const totalWealth = useMemo(() => {
    const income = filteredAndSortedTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const expense = filteredAndSortedTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    return income - expense;
  }, [filteredAndSortedTransactions]);

  // LOGIKA GRAFIK DINAMIS (Koneksi ke Total Wealth & Transaksi)
  const chartData = useMemo(() => {
    const monthlyBalances = [0, 0, 0, 0, 0];
    monthlyBalances[4] = totalWealth; // Poin terakhir (Mei) WAJIB mengambil totalWealth saat ini

    const monthlyNetChange = [0, 0, 0, 0, 0];
    filteredAndSortedTransactions.forEach(t => {
      const dateObj = new Date(t.date);
      const year = dateObj.getFullYear();
      const monthIdx = dateObj.getMonth(); // 0-11
      
      if (year === 2025 && monthIdx >= 0 && monthIdx <= 4) {
        const change = t.type === 'income' ? t.amount : -t.amount;
        monthlyNetChange[monthIdx] += change;
      }
    });

    monthlyBalances[3] = monthlyBalances[4] - monthlyNetChange[4];
    monthlyBalances[2] = monthlyBalances[3] - monthlyNetChange[3];
    monthlyBalances[1] = monthlyBalances[2] - monthlyNetChange[2];
    monthlyBalances[0] = monthlyBalances[1] - monthlyNetChange[1];

    let max = Math.max(...monthlyBalances);
    let min = Math.min(...monthlyBalances);
    if (max === min) {
      max += 1000000;
      min -= 1000000;
    }

    const points: Array<{ x: number; y: number; val: number }> = [];
    const step = (chartWidth - 42) / 4;
    const diff = max - min;

    monthlyBalances.forEach((val, idx) => {
      const x = 42 + idx * step;
      const y = 110 - ((val - min) / diff) * 100;
      points.push({ x, y, val });
    });

    const p0 = points[0];
    const p1 = points[1];
    const p2 = points[2];
    const p3 = points[3];
    const p4 = points[4];

    const pathD = `M ${p0.x} ${p0.y} 
                   C ${(p0.x + p1.x) / 2} ${p0.y}, ${(p0.x + p1.x) / 2} ${p1.y}, ${p1.x} ${p1.y} 
                   C ${(p1.x + p2.x) / 2} ${p1.y}, ${(p1.x + p2.x) / 2} ${p2.y}, ${p2.x} ${p2.y} 
                   C ${(p2.x + p3.x) / 2} ${p2.y}, ${(p2.x + p3.x) / 2} ${p3.y}, ${p3.x} ${p3.y} 
                   C ${(p3.x + p4.x) / 2} ${p3.y}, ${(p3.x + p4.x) / 2} ${p4.y}, ${p4.x} ${p4.y}`;
                   
    const fillD = `${pathD} L ${chartWidth} 140 L 42 140 Z`;

    let peakIdx = 0;
    let peakVal = monthlyBalances[0];
    monthlyBalances.forEach((val, idx) => {
      if (val > peakVal) {
        peakVal = val;
        peakIdx = idx;
      }
    });

    const peakPoint = points[peakIdx];

    return { pathD, fillD, peakPoint };
  }, [filteredAndSortedTransactions, totalWealth]);

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
      {/* SINKRONISASI HEADER ATAS */}
      <View style={styles.topHeader}>
        <View style={styles.profileRow}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }}
            style={styles.avatar}
          />
          <TouchableOpacity activeOpacity={0.7} style={styles.profileEditWrapper}>
            <Text style={styles.editAccountText}>Edit your account</Text>
            <Ionicons name="chevron-forward" size={12} color="#64748B" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.settingsButton} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* TOTAL WEALTH DISPLAY */}
      <View style={styles.wealthContainer}>
        <Text style={styles.wealthAmount}>
          {totalWealth < 0 ? '-' : ''}IDR {Math.abs(totalWealth).toLocaleString('id-ID')}
        </Text>
        <Text style={styles.wealthLabel}>Total Wealth</Text>
      </View>

      {/* WAVE LINE CHART DINAMIS */}
      <View style={styles.graphContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FF3366" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#FF3366" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Garis Grid Horizontal Putus-putus */}
          {[20, 44, 68, 92, 116, 140].map((yVal, idx) => {
            const labels = ['-1000k', '-750k', '-500k', '-250k', '-100k', '-0k'];
            return (
              <G key={idx}>
                <Line
                  x1={42}
                  y1={yVal}
                  x2={chartWidth}
                  y2={yVal}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={8}
                  y={yVal + 3}
                  fontSize="8"
                  fill="#94A3B8"
                  fontWeight="500"
                >
                  {labels[idx]}
                </SvgText>
              </G>
            );
          })}

          {/* AREA CHART GRADIENT DINAMIS */}
          <Path d={chartData.fillD} fill="url(#gradientRed)" />

          {/* WAVE LINE MERAH PREMIUM DINAMIS */}
          <Path
            d={chartData.pathD}
            fill="none"
            stroke="#FF3366"
            strokeWidth="3.5"
          />

          {/* BULATAN BERCURVE DINAMIS DI AREA PEAK */}
          {chartData.peakPoint && (
            <G>
              <Circle cx={chartData.peakPoint.x} cy={chartData.peakPoint.y} r={10} fill="#FF3366" opacity="0.25" />
              <Circle cx={chartData.peakPoint.x} cy={chartData.peakPoint.y} r={4.5} fill="#FF3366" />
              <SvgText
                x={chartData.peakPoint.x}
                y={chartData.peakPoint.y - 12}
                fontSize="9"
                fill="#FF3366"
                fontWeight="700"
                textAnchor="middle"
              >
                Peak (Rp {Math.round(chartData.peakPoint.val / 1000)}k)
              </SvgText>
            </G>
          )}
        </Svg>
        
        {/* Label X-Axis Bulan */}
        <View style={styles.xAxisRow}>
          <Text style={styles.xAxisText}>Jan 2025</Text>
          <Text style={styles.xAxisText}>Feb 2025</Text>
          <Text style={styles.xAxisText}>Mar 2025</Text>
          <Text style={styles.xAxisText}>Apr 2025</Text>
          <Text style={styles.xAxisText}>Mei 2025</Text>
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
        <TouchableOpacity 
          style={[styles.filterButton, filterTime !== 'all' || filterCategory !== 'all' || filterSort !== 'newest' ? styles.filterButtonActive : null]} 
          activeOpacity={0.8}
          onPress={openFilterModal}
        >
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
          const catDetails = getCategoryDetails(item.category);
          const isExpense = item.type === 'expense';

          const parts = item.description.split('|||');
          const name = parts[0];
          const extra = parts[1] || '';

          return (
            <View style={styles.transactionRow}>
              <View style={styles.rowLeft}>
                <View style={[styles.categoryBadge, { backgroundColor: `${catDetails.color}20` }]}>
                  <Ionicons name={catDetails.icon as any} size={18} color={catDetails.color} />
                </View>
                <View style={styles.textStack}>
                  <Text style={styles.itemTitle}>{name}</Text>
                  <Text style={styles.itemSub}>
                    {catDetails.label} • {extra || 'No description'}
                  </Text>
                </View>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.itemAmount, isExpense ? styles.expenseAmount : styles.incomeAmount]}>
                  {isExpense ? '-' : '+'}IDR {item.amount.toLocaleString('id-ID')}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    setSelectedMenuTransaction(item);
                    setIsMenuOpen(true);
                  }} 
                  style={styles.menuIconButton}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="#9EB3CD" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions yet. Record your first income or expense!</Text>
          </View>
        }
      />

      {/* FLOATING ACTION BUTTON (FAB) */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => {
          resetForm();
          setIsModalOpen(true);
        }}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* NEW/EDIT TRANSACTION FORM MODAL */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <TouchableOpacity 
                  onPress={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }} 
                  style={styles.backButton}
                >
                  <Ionicons name="chevron-back" size={20} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editingTransactionId ? 'Edit Transaction' : 'New Transactions'}
                </Text>
              </View>
            </View>

            <View style={styles.modalForm}>
              {/* TRANSACTION TYPE SELECTOR */}
              <View style={styles.typeSelectorWrapper}>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorTab,
                    transactionType === 'expense' ? styles.typeSelectorTabActiveExpense : styles.typeSelectorTabInactive
                  ]}
                  onPress={() => {
                    setTransactionType('expense');
                    setSelectedCategory(null); // Reset category selection when swapping types
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.typeSelectorText,
                    transactionType === 'expense' ? styles.typeSelectorTextActive : styles.typeSelectorTextInactive
                  ]}>
                    Outcome
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeSelectorTab,
                    transactionType === 'income' ? styles.typeSelectorTabActiveIncome : styles.typeSelectorTabInactive
                  ]}
                  onPress={() => {
                    setTransactionType('income');
                    setSelectedCategory(null); // Reset category selection when swapping types
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.typeSelectorText,
                    transactionType === 'income' ? styles.typeSelectorTextActive : styles.typeSelectorTextInactive
                  ]}>
                    Income
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TRANSACTION NAME & CATEGORY PICKER LAUNCHER */}
              <View style={styles.topFieldWrapper}>
                <TouchableOpacity 
                  onPress={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)} 
                  style={[
                    styles.categoryCircleLauncher, 
                    { backgroundColor: selectedCategory ? selectedCategory.color : '#9EB3CD' }
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={selectedCategory ? (selectedCategory.icon as any) : 'help-outline'} 
                    size={20} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>
                <TextInput
                  style={styles.underlineInput}
                  placeholder="Enter transaction name"
                  placeholderTextColor="#94A3B8"
                  value={transactionName}
                  onChangeText={setTransactionName}
                />
              </View>

              {/* GRID CATEGORI SUB-MENU */}
              {isCategoryPickerOpen && (
                <View style={styles.categoryGridContainer}>
                  <Text style={styles.categoryGridTitle}>Select Category</Text>
                  <View style={styles.categoriesGrid}>
                    {categoriesList.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.catGridItem,
                          selectedCategory?.id === cat.id && styles.catGridItemActive
                        ]}
                        onPress={() => {
                          setSelectedCategory(cat);
                          setIsCategoryPickerOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.catGridItemBadge, { backgroundColor: cat.color }]}>
                          <Ionicons name={cat.icon as any} size={14} color="#FFFFFF" />
                        </View>
                        <Text style={styles.catGridItemLabel}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* INPUT FIELDS STACK */}
              <View style={styles.fieldsStack}>
                <View style={styles.capsuleInputWrapper}>
                  <TextInput
                    style={styles.capsuleInput}
                    placeholder="Amount (IDR)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={amountInput}
                    onChangeText={(text) => setAmountInput(formatThousandsSeparator(text))}
                  />
                </View>

                {/* MULTI-WALLET (ACCOUNT) SELECTOR */}
                <View style={styles.accountSelectorWrapper}>
                  <Text style={styles.formLabel}>Source Wallet</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.accountsScrollContent}
                    style={styles.accountsScrollView}
                  >
                    {accounts.map(acc => {
                      const isSelected = selectedAccountId === acc.id;
                      return (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.accountChip,
                            isSelected ? styles.accountChipActive : styles.accountChipInactive
                          ]}
                          onPress={() => setSelectedAccountId(acc.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.accountChipText,
                            isSelected ? styles.accountChipTextActive : styles.accountChipTextInactive
                          ]}>
                            {acc.name}
                          </Text>
                          <Text style={[
                            styles.accountChipBalance,
                            isSelected ? styles.accountChipBalanceActive : styles.accountChipBalanceInactive
                          ]}>
                            {formatIDR(acc.balance)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.capsuleInputWrapper}>
                  <TextInput
                    style={styles.capsuleInput}
                    placeholder="Description"
                    placeholderTextColor="#94A3B8"
                    value={extraDescription}
                    onChangeText={setExtraDescription}
                  />
                </View>
              </View>

              {/* CONFIRM BUTTON */}
              <TouchableOpacity 
                style={styles.submitButton} 
                activeOpacity={0.8}
                onPress={handleConfirmTransaction}
              >
                <Text style={styles.submitButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* KUSTOM MODAL MENU KARTU */}
      <Modal visible={isMenuOpen} animationType="fade" transparent>
        <View style={styles.cardMenuOverlay}>
          <View style={styles.cardMenuContainer}>
            <TouchableOpacity 
              style={styles.closeMenuButton}
              onPress={() => {
                setIsMenuOpen(false);
                setSelectedMenuTransaction(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.cardMenuTitle}>Transaction Options</Text>
            <Text style={styles.cardMenuSubtitle}>
              Choose action for "{selectedMenuTransaction ? selectedMenuTransaction.description.split('|||')[0] : ''}"
            </Text>

            <View style={styles.cardActionsStack}>
              <TouchableOpacity 
                style={[styles.cardActionButton, styles.cardEditButton]}
                onPress={initiateEdit}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color="#333D53" style={{ marginRight: 8 }} />
                <Text style={styles.cardEditButtonText}>Edit Details</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.cardActionButton, styles.cardDeleteButton]}
                onPress={confirmDelete}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.cardDeleteButtonText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.cardActionButton, styles.cardCancelButton]}
                onPress={() => {
                  setIsMenuOpen(false);
                  setSelectedMenuTransaction(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cardCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BOTTOM SHEET FILTER MODAL */}
      <Modal visible={isFilterModalOpen} animationType="slide" transparent>
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            {/* Header Bottom Sheet */}
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Filter Transactions</Text>
              <TouchableOpacity 
                style={styles.closeBottomSheetButton}
                onPress={() => setIsFilterModalOpen(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#333D53" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.bottomSheetScroll}>
              {/* Group 1: Time Range */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Time Range</Text>
                <View style={styles.chipsContainer}>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                    { id: 'month', label: 'This Month' }
                  ].map(timeOpt => {
                    const isSelected = tempTime === timeOpt.id;
                    return (
                      <TouchableOpacity
                        key={timeOpt.id}
                        style={[styles.chip, isSelected ? styles.chipActive : styles.chipInactive]}
                        onPress={() => setTempTime(timeOpt.id as any)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, isSelected ? styles.chipTextActive : styles.chipTextInactive]}>
                          {timeOpt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Group 2: Category Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Category</Text>
                <View style={styles.chipsContainer}>
                  <TouchableOpacity
                    style={[styles.chip, tempCategory === 'all' ? styles.chipActive : styles.chipInactive]}
                    onPress={() => setTempCategory('all')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, tempCategory === 'all' ? styles.chipTextActive : styles.chipTextInactive]}>
                      All Categories
                    </Text>
                  </TouchableOpacity>

                  {CATEGORIES.map(cat => {
                    const isSelected = tempCategory.toLowerCase() === cat.id.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.chip, 
                          isSelected ? styles.chipActive : styles.chipInactive,
                          isSelected ? { borderColor: cat.color, backgroundColor: `${cat.color}20` } : null
                        ]}
                        onPress={() => setTempCategory(cat.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.chipBadge, { backgroundColor: cat.color }]} />
                        <Text style={[
                          styles.chipText, 
                          isSelected ? { color: cat.color, fontWeight: '700' } : styles.chipTextInactive
                        ]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Group 3: Sort By */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Sort By</Text>
                <View style={styles.chipsContainer}>
                  {[
                    { id: 'newest', label: 'Newest' },
                    { id: 'oldest', label: 'Oldest' },
                    { id: 'highest', label: 'Highest Amount' }
                  ].map(sortOpt => {
                    const isSelected = tempSort === sortOpt.id;
                    return (
                      <TouchableOpacity
                        key={sortOpt.id}
                        style={[styles.chip, isSelected ? styles.chipActive : styles.chipInactive]}
                        onPress={() => setTempSort(sortOpt.id as any)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, isSelected ? styles.chipTextActive : styles.chipTextInactive]}>
                          {sortOpt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Bottom Actions Row */}
            <View style={styles.bottomSheetActions}>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={resetFilters}
                activeOpacity={0.7}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={applyFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  profileEditWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editAccountText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
  },
  settingsButton: {
    padding: 4,
  },
  wealthContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 12,
  },
  wealthAmount: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '700',
    color: '#333D53',
  },
  wealthLabel: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  graphContainer: {
    height: 185,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingLeft: 42,
  },
  xAxisText: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
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
    backgroundColor: '#EEF1F6',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3A86FF',
  },
  filterButtonText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: '#333D53',
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
    fontWeight: '700',
    color: '#333D53',
  },
  itemSub: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#9EB3CD',
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconButton: {
    padding: 6,
    marginLeft: 6,
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
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyStateText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
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
    borderBottomColor: '#9EB3CD',
    paddingBottom: 8,
  },
  categoryCircleLauncher: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  underlineInput: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 14,
    color: '#1E293B',
  },
  categoryGridContainer: {
    backgroundColor: '#FAFBFD',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E7EAF3',
  },
  categoryGridTitle: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catGridItem: {
    width: '18%',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    borderRadius: 8,
  },
  catGridItemActive: {
    backgroundColor: '#F2F5FF',
    borderWidth: 0.5,
    borderColor: '#3A86FF',
  },
  catGridItemBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catGridItemLabel: {
    fontFamily: 'System',
    fontSize: 9,
    color: '#333D53',
    fontWeight: '500',
    textAlign: 'center',
  },
  fieldsStack: {
    flexDirection: 'column',
    gap: 14,
  },
  capsuleInputWrapper: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF1F6',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  capsuleInput: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#1E293B',
  },
  submitButton: {
    height: 50,
    borderRadius: 24,
    backgroundColor: '#3A86FF',
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
  cardMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(51, 61, 83, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardMenuContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    shadowColor: '#333D53',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  closeMenuButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardMenuTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700',
    color: '#333D53',
    marginBottom: 4,
  },
  cardMenuSubtitle: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#9EB3CD',
    marginBottom: 20,
    lineHeight: 16,
  },
  cardActionsStack: {
    gap: 10,
  },
  cardActionButton: {
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEditButton: {
    backgroundColor: '#F1F5F9',
  },
  cardEditButtonText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#333D53',
  },
  cardDeleteButton: {
    backgroundColor: '#FFF2F2',
  },
  cardDeleteButtonText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  cardCancelButton: {
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  cardCancelButtonText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  // BOTTOM SHEET FILTER STYLING
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(51, 61, 83, 0.35)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: '#F8F9FC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  bottomSheetTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700',
    color: '#333D53',
  },
  closeBottomSheetButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF1F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetScroll: {
    paddingVertical: 16,
    gap: 20,
  },
  filterGroup: {
    gap: 10,
  },
  filterGroupTitle: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '700',
    color: '#333D53',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 0.5,
  },
  chipInactive: {
    backgroundColor: '#EEF1F6',
    borderColor: '#EEF1F6',
  },
  chipActive: {
    backgroundColor: '#3A86FF',
    borderColor: '#3A86FF',
  },
  chipText: {
    fontFamily: 'System',
    fontSize: 12,
  },
  chipTextInactive: {
    color: '#333D53',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  bottomSheetActions: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F6',
    paddingTop: 16,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF1F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  applyButton: {
    flex: 2,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#3A86FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // MULTI-WALLET ACCOUNT SELECTOR STYLES
  accountSelectorWrapper: {
    marginVertical: 4,
  },
  formLabel: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  accountsScrollView: {
    flexGrow: 0,
  },
  accountsScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
    flexDirection: 'row',
  },
  accountChip: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountChipActive: {
    backgroundColor: '#2F95F6',
    borderColor: '#2F95F6',
    shadowColor: '#2F95F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  accountChipInactive: {
    backgroundColor: '#EEF1F6',
    borderColor: '#CBD5E1',
  },
  accountChipText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
  },
  accountChipTextActive: {
    color: '#FFFFFF',
  },
  accountChipTextInactive: {
    color: '#1E293B',
  },
  accountChipBalance: {
    fontFamily: 'System',
    fontSize: 11,
    marginTop: 2,
  },
  accountChipBalanceActive: {
    color: '#E0F2FE',
    fontWeight: '500',
  },
  accountChipBalanceInactive: {
    color: '#64748B',
  },
  // TRANSACTION TYPE SELECTOR STYLES
  typeSelectorWrapper: {
    flexDirection: 'row',
    backgroundColor: '#EEF1F6',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  typeSelectorTab: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeSelectorTabActiveExpense: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  typeSelectorTabActiveIncome: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  typeSelectorTabInactive: {
    backgroundColor: 'transparent',
  },
  typeSelectorText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
  },
  typeSelectorTextActive: {
    color: '#FFFFFF',
  },
  typeSelectorTextInactive: {
    color: '#64748B',
  },
});
