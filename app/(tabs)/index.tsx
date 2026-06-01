import { getDatabase } from '@/core/database/sqlite';
import { formatIDR } from '@/core/formatters/currency';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

interface CategoryExpense {
  category: string;
  total: number;
  color: string;
  percentage: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF7A7A',
  shopping: '#FFB067',
  transport: '#52B6FF',
  entertainment: '#B39DDB',
  bills: '#46CDCF',
  groceries: '#81C784',
  health: '#FF8AAB',
  education: '#A1887F',
  investment: '#4DB6AC',
  others: '#90A4AE',
};

export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Financial States
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalOutcome, setTotalOutcome] = useState(0);
  const [totalWealth, setTotalWealth] = useState(0);
  const [spentToday, setSpentToday] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(200000); // limit default: 200.000
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([]);

  // Edit Limit Modal States
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [newLimitInput, setNewLimitInput] = useState('');

  // Calculate current month string using device local timezone offset
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const localNow = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return localNow.toISOString().slice(0, 7);
  }, []);

  const loadOfflineData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const now = new Date();
      const localNow = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
      const todayStr = localNow.toISOString().split('T')[0];

      // Empty transaction check for self-healing balance ledger integrity
      const txCountRows = await db.getAllAsync<any>(
        "SELECT COUNT(*) as count FROM transactions"
      );
      const txCount = txCountRows[0]?.count || 0;
      if (txCount === 0) {
        await db.runAsync("UPDATE accounts SET balance = 0");
      }

      // 0. DINAMISASI TOTAL WEALTH (SUM Balance dari tabel accounts)
      const wealthRows = await db.getAllAsync<any>(
        "SELECT SUM(balance) AS total FROM accounts"
      );
      const sumWealth = wealthRows[0]?.total || 0;
      setTotalWealth(sumWealth);

      // 1. DINAMISASI INCOME & OUTCOME (SUM Transaksi dari SQLite)
      const incomeRows = await db.getAllAsync<any>(
        "SELECT SUM(amount) AS total FROM transactions WHERE user_id = ? AND type = 'income'",
        ['offline-user']
      );
      const outcomeRows = await db.getAllAsync<any>(
        "SELECT SUM(amount) AS total FROM transactions WHERE user_id = ? AND type = 'expense'",
        ['offline-user']
      );

      const sumIncome = incomeRows[0]?.total || 0;
      const sumOutcome = outcomeRows[0]?.total || 0;
      
      setTotalIncome(sumIncome);
      setTotalOutcome(sumOutcome);

      // 2. DINAMISASI DAILY LIMITS & PROGRESS METER (Hari ini saja)
      const todayRows = await db.getAllAsync<any>(
        "SELECT SUM(amount) AS total FROM transactions WHERE user_id = ? AND type = 'expense' AND date = ?",
        ['offline-user', todayStr]
      );
      setSpentToday(todayRows[0]?.total || 0);

      // Ambil batas harian dari SQLite budgets jika terdefinisi, atau default 200.000
      const budgetRows = await db.getAllAsync<any>(
        "SELECT SUM(amount) AS total FROM budgets WHERE user_id = ? AND month = ?",
        ['offline-user', currentMonthStr]
      );
      const monthlyBudgetLimit = budgetRows[0]?.total || 6000000;
      // Konversi budget bulanan menjadi harian secara kasar (dibagi 30 hari)
      const calculatedDailyLimit = Math.max(Math.round(monthlyBudgetLimit / 30), 100000);
      setDailyLimit(calculatedDailyLimit);

      // 3. DINAMISASI COST ANALYSIS (PIE CHART) - Grouping SQLite Kategori
      const categoryRows = await db.getAllAsync<any>(
        "SELECT category, SUM(amount) AS total FROM transactions WHERE user_id = ? AND type = 'expense' GROUP BY category ORDER BY total DESC",
        ['offline-user']
      );

      if (categoryRows && categoryRows.length > 0) {
        const sumAllExpenses = categoryRows.reduce((acc: number, curr: any) => acc + curr.total, 0);
        
        // Petakan hasil kueri ke format visual Pie Chart dinamis
        const mappedExpenses: CategoryExpense[] = categoryRows.map((row: any) => {
          const key = row.category.toLowerCase();
          const color = CATEGORY_COLORS[key] || CATEGORY_COLORS.others;
          const percentage = sumAllExpenses > 0 ? (row.total / sumAllExpenses) * 100 : 0;
          return {
            category: row.category,
            total: row.total,
            color,
            percentage,
          };
        });
        
        setCategoryExpenses(mappedExpenses);
      } else {
        setCategoryExpenses([]);
      }

    } catch (error) {
      console.error('Failed to load local SQLite dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonthStr]);

  // AUTO-REFRESH DENGAN useFocusEffect: Pemicu setiap kali halaman fokus/aktif kembali
  useFocusEffect(
    useCallback(() => {
      loadOfflineData();
    }, [loadOfflineData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOfflineData();
  }, [loadOfflineData]);

  // Save/Persist budget limit change into SQLite
  const handleSaveDailyLimit = async () => {
    const rawLimit = parseFloat(newLimitInput);
    if (isNaN(rawLimit) || rawLimit <= 0) {
      Alert.alert('Error', 'Please enter a valid daily limit amount');
      return;
    }

    const monthlyBudget = rawLimit * 30;

    try {
      const db = await getDatabase();
      const budgetRows = await db.getAllAsync<any>(
        "SELECT * FROM budgets WHERE user_id = ? AND month = ?",
        ['offline-user', currentMonthStr]
      );

      if (budgetRows && budgetRows.length > 0) {
        // Update first one, delete any duplicates
        const firstId = budgetRows[0].id;
        await db.runAsync(
          "UPDATE budgets SET amount = ?, sync_status = 'pending' WHERE id = ?",
          [monthlyBudget, firstId]
        );
        if (budgetRows.length > 1) {
          const idsToDelete = budgetRows.slice(1).map(r => r.id);
          for (const idToDelete of idsToDelete) {
            await db.runAsync("DELETE FROM budgets WHERE id = ?", [idToDelete]);
          }
        }
      } else {
        // Insert a new budget record
        const newId = String(Date.now());
        await db.runAsync(
          "INSERT INTO budgets (id, user_id, category, amount, month, sync_status) VALUES (?, ?, ?, ?, ?, 'pending')",
          [newId, 'offline-user', 'Total', monthlyBudget, currentMonthStr]
        );
      }

      await loadOfflineData();
      setIsLimitModalOpen(false);
    } catch (error) {
      console.error('Failed to save daily limit:', error);
      Alert.alert('Error', 'Failed to save daily limit');
    }
  };

  // Hitung persentase penggunaan batas harian
  const dailyRatio = dailyLimit > 0 ? spentToday / dailyLimit : 0;
  const dailyPercentage = Math.round(Math.min(dailyRatio * 100, 100));

  // Penentuan warna indikator (merah jika melampaui batas harian)
  const isOverBudget = spentToday > dailyLimit;
  const progressColor = isOverBudget ? '#EF4444' : '#2F95F6';

  // LOGIKA SEGMENTASI PIE CHART DONUT DINAMIS
  const donutSegments = useMemo(() => {
    let accumulatedAngle = -90; // mulai dari atas (12 o'clock)
    const radius = 45;
    const circumference = 2 * Math.PI * radius; // ~282.74

    return categoryExpenses.map(item => {
      const angle = (item.percentage / 100) * 360;
      const strokeDashoffset = circumference - (item.percentage / 100) * circumference;
      const rotate = accumulatedAngle;
      accumulatedAngle += angle;

      return {
        ...item,
        strokeDashoffset,
        circumference,
        rotate,
      };
    });
  }, [categoryExpenses]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2F95F6" />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2F95F6" />
        }
      >
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }}
              style={styles.avatar}
            />
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.editAccountText}>Edit your account</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.settingsButton} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* TOTAL WEALTH CARD */}
        <View style={styles.wealthCard}>
          <View style={styles.wealthHeader}>
            <Ionicons name="wallet-outline" size={18} color="#2F95F6" />
            <Text style={styles.wealthLabel}>Total Wealth</Text>
          </View>
          <Text style={styles.wealthValue}>{formatIDR(totalWealth)}</Text>
        </View>

        {/* MINI CARDS (Income & Outcome dinamis dari SQLite) */}
        <View style={styles.summaryGrid}>
          <View style={styles.incomeCard}>
            <Text style={styles.incomeLabel}>Income</Text>
            <Text style={styles.incomeValue}>{formatIDR(totalIncome)}</Text>
          </View>
          <View style={styles.outcomeCard}>
            <Text style={styles.outcomeLabel}>Outcome</Text>
            <Text style={styles.outcomeValue}>{formatIDR(totalOutcome)} / Month</Text>
          </View>
        </View>

        {/* COST ANALYST SECTION (Pie Chart Donut Dinamis) */}
        <View style={styles.costAnalystContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cost Analyst</Text>
            <TouchableOpacity 
              style={styles.readMoreButton} 
              activeOpacity={0.8}
              onPress={() => router.push('/spends' as any)}
            >
              <Text style={styles.readMoreText}>Read more</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chartLayout}>
            {/* Cincin Donut SVG Dinamis Mengikuti Data Riil */}
            <View style={styles.donutWrapper}>
              <Svg width={120} height={120} viewBox="0 0 120 120">
                <G transform="rotate(0 60 60)">
                  {/* Lingkaran Dasar Transparan/Abu */}
                  <Circle
                     cx={60}
                     cy={60}
                     r={45}
                     stroke="#EEF1F6"
                     strokeWidth={12}
                     fill="none"
                   />
                  {/* Segmen Warna-Warni Berdasarkan Proporsi Persentase Pengeluaran */}
                  {donutSegments.map((segment, idx) => (
                    <Circle
                      key={idx}
                      cx={60}
                      cy={60}
                      r={45}
                      stroke={segment.color}
                      strokeWidth={12}
                      strokeDasharray={segment.circumference}
                      strokeDashoffset={segment.strokeDashoffset}
                      fill="none"
                      transform={`rotate(${segment.rotate} 60 60)`}
                      strokeLinecap="round"
                    />
                  ))}
                </G>
              </Svg>

              {/* Lubang Tengah Donut */}
              <View style={styles.donutCenter}>
                <Ionicons name="pie-chart" size={18} color="#64748B" />
                <Text style={styles.donutCenterText}>Expenses</Text>
              </View>
            </View>

            {/* Legenda Kategori Dinamis */}
            <ScrollView 
              showsVerticalScrollIndicator={false} 
              style={styles.legendContainer}
              contentContainerStyle={styles.legendScrollContent}
            >
              {categoryExpenses.slice(0, 3).map((item, idx) => (
                <View key={idx} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.legendCategory}>{item.category} ({item.percentage.toFixed(0)}%)</Text>
                    <Text style={styles.legendValue} numberOfLines={1}>{formatIDR(item.total)}</Text>
                  </View>
                </View>
              ))}

              {categoryExpenses.length === 0 && (
                <View style={styles.emptyLegend}>
                  <Text style={styles.emptyLegendText}>No expenses logged</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>

        {/* DAILY LIMITS CARD (Dinamis Berdasarkan Pengeluaran Hari Ini) */}
        <View style={styles.limitsCard}>
          <View style={styles.limitsHeader}>
            <View>
              <Text style={styles.limitsTitle}>Daily Limits</Text>
              <TouchableOpacity style={styles.dropdownTrigger} activeOpacity={0.7}>
                <Text style={styles.dropdownText}>By weeks</Text>
                <Ionicons name="chevron-down" size={10} color="#2F95F6" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.editLimitButton} 
              activeOpacity={0.8}
              onPress={() => {
                setNewLimitInput(String(dailyLimit));
                setIsLimitModalOpen(true);
              }}
            >
              <Text style={styles.editLimitText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Bilah Kemajuan Dinamis Hari Ini */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${dailyPercentage}%`,
                    backgroundColor: progressColor 
                  }
                ]} 
              />
            </View>
            <View style={styles.ratioRow}>
              <Text style={styles.ratioText}>
                {formatIDR(spentToday)} / {formatIDR(dailyLimit)}
              </Text>
              <Text style={[styles.percentageText, { color: progressColor }]}>
                {dailyPercentage}%
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* EDIT DAILY LIMIT MODAL POP-UP */}
      <Modal visible={isLimitModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Daily Limit</Text>
              <TouchableOpacity 
                onPress={() => setIsLimitModalOpen(false)} 
                style={styles.closeModalButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#333D53" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.capsuleInputWrapper}>
                <TextInput
                  style={styles.capsuleInput}
                  placeholder="Daily Limit (IDR)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={newLimitInput}
                  onChangeText={setNewLimitInput}
                />
              </View>

              <TouchableOpacity 
                style={styles.submitButton} 
                activeOpacity={0.8}
                onPress={handleSaveDailyLimit}
              >
                <Text style={styles.submitButtonText}>Save Limit</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  editAccountText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
  },
  settingsButton: {
    padding: 4,
  },
  wealthCard: {
    borderRadius: 24,
    backgroundColor: '#EEF4FF',
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D0E1FD',
    shadowColor: '#2F95F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  wealthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  wealthLabel: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '500',
    color: '#1E3A8A',
  },
  wealthValue: {
    fontFamily: 'System',
    fontSize: 26,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  incomeCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#E8F5E9',
  },
  incomeLabel: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '400',
  },
  incomeValue: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
    marginTop: 4,
  },
  outcomeCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#FFEBEE',
  },
  outcomeLabel: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#C62828',
    fontWeight: '400',
  },
  outcomeValue: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#B71C1C',
    marginTop: 4,
  },
  costAnalystContainer: {
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  readMoreButton: {
    backgroundColor: '#2F95F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  readMoreText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  chartLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  donutWrapper: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  donutCenter: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterText: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
    maxHeight: 120,
  },
  legendScrollContent: {
    flexDirection: 'column',
    gap: 12,
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendCategory: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '400',
  },
  legendValue: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginTop: 1,
  },
  limitsCard: {
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    padding: 16,
  },
  limitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  limitsTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  dropdownText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#2F95F6',
    fontWeight: '400',
  },
  editLimitButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2F95F6',
  },
  editLimitText: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  progressBarWrapper: {
    marginTop: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  ratioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  ratioText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  percentageText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
  },
  // EDIT DAILY LIMIT MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeModalButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF1F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalForm: {
    marginTop: 24,
    gap: 20,
  },
  capsuleInputWrapper: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#EEF1F6',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  capsuleInput: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#1E293B',
  },
  submitButton: {
    height: 50,
    borderRadius: 24,
    backgroundColor: '#3A86FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyLegend: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyLegendText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#94A3B8',
  },
});