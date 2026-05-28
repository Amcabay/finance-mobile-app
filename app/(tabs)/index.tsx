import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatIDR } from '@/core/formatters/currency';
import { BudgetRepository } from '@/features/budgets/repository/BudgetRepository';

const budgetRepository = new BudgetRepository();

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalBudget, setTotalBudget] = useState(350000);
  const [spentAmount, setSpentAmount] = useState(250000);
  const [budgetsList, setBudgetsList] = useState<any[]>([]);

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const loadOfflineData = useCallback(async () => {
    try {
      const localBudgets = await budgetRepository.getBudgets('offline-user', currentMonthStr);
      
      if (localBudgets && localBudgets.length > 0) {
        const sumLimit = localBudgets.reduce((acc, b) => acc + b.amount, 0);
        setTotalBudget(sumLimit);
        // Hitung penggunaan fungsional (misal 71% dari total limit)
        setSpentAmount(Math.round(sumLimit * 0.71));
        setBudgetsList(localBudgets);
      } else {
        // Seeding awal data budget offline secara otomatis agar database lokal memiliki data
        const defaultBudgets = [
          { category: 'Food', amount: 150000 },
          { category: 'Shopping', amount: 120000 },
          { category: 'Transport', amount: 80000 },
        ];
        
        for (const b of defaultBudgets) {
          await budgetRepository.add('offline-user', {
            category: b.category,
            amount: b.amount,
            month: currentMonthStr,
          });
        }
        
        setTotalBudget(350000);
        setSpentAmount(250000);
        setBudgetsList(defaultBudgets);
      }
    } catch (error) {
      console.error('Failed to load local budgets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonthStr]);

  useEffect(() => {
    loadOfflineData();
  }, [loadOfflineData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOfflineData();
  }, [loadOfflineData]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2F95F6" />
      </View>
    );
  }

  const budgetRatio = totalBudget > 0 ? spentAmount / totalBudget : 0;

  return (
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

      {/* MINI CARDS (Income & Outcome Summary) */}
      <View style={styles.summaryGrid}>
        <View style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Income</Text>
          <Text style={styles.incomeValue}>Rp 2.500.000</Text>
        </View>
        <View style={styles.outcomeCard}>
          <Text style={styles.outcomeLabel}>Outcome</Text>
          <Text style={styles.outcomeValue}>Rp 2.500.000 / Month</Text>
        </View>
      </View>

      {/* COST ANALYST SECTION (Pie Chart Mockup) */}
      <View style={styles.costAnalystContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Cost Analyst</Text>
          <TouchableOpacity style={styles.readMoreButton} activeOpacity={0.8}>
            <Text style={styles.readMoreText}>Read more</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chartLayout}>
          {/* Creative Donut Chart Segments */}
          <View style={styles.donutWrapper}>
            {/* Segment Biru (Primary 26%) */}
            <View style={[styles.donutSegment, { borderColor: '#2F95F6' }]} />
            {/* Segment Merah (Danger 45%) */}
            <View style={[styles.donutSegment, styles.donutSegmentRed]} />
            {/* Segment Orange (Warning 30%) */}
            <View style={[styles.donutSegment, styles.donutSegmentOrange]} />
            
            {/* Lubang Donut Tengah */}
            <View style={styles.donutCenter}>
              <Ionicons name="pie-chart" size={20} color="#64748B" />
              <Text style={styles.donutCenterText}>71% spent</Text>
            </View>
          </View>

          {/* Legenda Data */}
          <View style={styles.legendContainer}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <View>
                <Text style={styles.legendCategory}>Food (45%)</Text>
                <Text style={styles.legendValue}>Rp 1.125.000</Text>
              </View>
            </View>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <View>
                <Text style={styles.legendCategory}>Shopping (30%)</Text>
                <Text style={styles.legendValue}>Rp 750.000</Text>
              </View>
            </View>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#2F95F6' }]} />
              <View>
                <Text style={styles.legendCategory}>Transport (26%)</Text>
                <Text style={styles.legendValue}>Rp 625.000</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* DAILY LIMITS CARD */}
      <View style={styles.limitsCard}>
        <View style={styles.limitsHeader}>
          <View>
            <Text style={styles.limitsTitle}>Daily Limits</Text>
            <TouchableOpacity style={styles.dropdownTrigger} activeOpacity={0.7}>
              <Text style={styles.dropdownText}>By weeks</Text>
              <Ionicons name="chevron-down" size={10} color="#2F95F6" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.editLimitButton} activeOpacity={0.8}>
            <Text style={styles.editLimitText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Progress Bar dari Budget SQLite */}
        <View style={styles.progressBarWrapper}>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${Math.min(budgetRatio * 100, 100)}%` }
              ]} 
            />
          </View>
          <View style={styles.ratioRow}>
            <Text style={styles.ratioText}>
              {formatIDR(spentAmount)} / {formatIDR(totalBudget)}
            </Text>
            <Text style={styles.percentageText}>
              {(budgetRatio * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 90, // Margin aman agar tidak terpotong floating tab bar
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
    fontFamily: 'System', // Fallback SF Pro Display
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
  },
  settingsButton: {
    padding: 4,
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
    // Soft shadow effect
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
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  donutSegment: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 14,
  },
  donutSegmentRed: {
    borderColor: 'transparent',
    borderTopColor: '#EF4444',
    borderRightColor: '#EF4444',
    transform: [{ rotate: '45deg' }],
  },
  donutSegmentOrange: {
    borderColor: 'transparent',
    borderBottomColor: '#F59E0B',
    transform: [{ rotate: '-60deg' }],
  },
  donutCenter: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterText: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  legendContainer: {
    flexDirection: 'column',
    gap: 12,
    flex: 1,
    marginLeft: 16,
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
    backgroundColor: '#2F95F6',
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
    color: '#2F95F6',
  },
});
