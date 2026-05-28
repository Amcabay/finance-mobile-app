import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BillRepository } from '@/features/bills/repository/BillRepository';
import { formatIDR } from '@/core/formatters/currency';

const billRepository = new BillRepository();

export default function BillsScreen() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billingDay, setBillingDay] = useState('');
  const [category, setCategory] = useState('Subscription');

  const loadOfflineBills = useCallback(async () => {
    try {
      const dbBills = await billRepository.getBills('offline-user');
      
      if (dbBills && dbBills.length > 0) {
        setBills(dbBills);
      } else {
        // Seeding tagihan offline default jika SQLite kosong
        const defaultBills = [
          {
            name: 'Wifi Internet',
            amount: 350000,
            category: 'Internet',
            frequency: 'monthly',
            billing_day: 15,
            active: true,
          },
          {
            name: 'Electricity Token',
            amount: 250000,
            category: 'Utility',
            frequency: 'monthly',
            billing_day: 5,
            active: true,
          }
        ];

        const seeded = [];
        for (const b of defaultBills) {
          const added = await billRepository.add('offline-user', b);
          seeded.push(added);
        }
        setBills(seeded);
      }
    } catch (error) {
      console.error('Failed to load offline bills:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfflineBills();
  }, [loadOfflineBills]);

  const handleAddBill = async () => {
    const amountVal = parseFloat(billAmount);
    const dayVal = parseInt(billingDay);

    if (!billName.trim()) {
      Alert.alert('Error', 'Please enter bills name');
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (isNaN(dayVal) || dayVal < 1 || dayVal > 31) {
      Alert.alert('Error', 'Billing day must be between 1 and 31');
      return;
    }

    try {
      const newBill = await billRepository.add('offline-user', {
        name: billName,
        amount: amountVal,
        category: category,
        frequency: 'monthly',
        billing_day: dayVal,
        active: true,
      });

      setBills(prev => [newBill, ...prev]);
      setIsAdding(false);
      setBillName('');
      setBillAmount('');
      setBillingDay('');
    } catch (error) {
      console.error('Failed to save bill:', error);
      Alert.alert('Error', 'Failed to save bill locally');
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16 }
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* WELCOME BANNER */}
      <View style={styles.welcomeBanner}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerTitle}>Welcome back!</Text>
          <Text style={styles.bannerSubtitle}>You didn't have any late payment!</Text>
        </View>
        <TouchableOpacity 
          style={styles.bannerButton} 
          activeOpacity={0.8}
          onPress={() => setIsAdding(true)}
        >
          <Text style={styles.bannerButtonText}>Add now</Text>
        </TouchableOpacity>
      </View>

      {/* RECENT BILLS LIST */}
      <View style={styles.billsListHeaderRow}>
        <Text style={styles.billsListTitle}>Recent Bills</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.seeAllLink}>See all</Text>
        </TouchableOpacity>
      </View>

      {bills.map(b => (
        <View key={b.id} style={styles.billCard}>
          <View style={styles.billCardHeader}>
            <View style={styles.categoryBadge}>
              <Ionicons 
                name={b.category.toLowerCase() === 'internet' ? 'wifi' : 'flash-outline'} 
                size={16} 
                color="#F59E0B" 
              />
            </View>
            <Text style={styles.billCardTitle}>{b.name}</Text>
          </View>

          <View style={styles.billCardDataRows}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Amount</Text>
              <Text style={styles.dataValueAmount}>IDR {b.amount.toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Installment</Text>
              <Text style={styles.dataValue}>Monthly</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Billing Day</Text>
              <Text style={styles.dataValue}>Day {b.billing_day} of month</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Status</Text>
              <Text style={[styles.dataValue, { color: b.active ? '#10B981' : '#64748B', fontWeight: '700' }]}>
                {b.active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* SPLIT BILLS CONTAINER */}
      <View style={styles.splitBillsCard}>
        <Text style={styles.splitBillsTitle}>Split Bills</Text>
        <View style={styles.splitBillsContent}>
          <Text style={styles.splitBillsMainText}>No Split Bills yet</Text>
          <Text style={styles.splitBillsSubText}>You can now split bill by using camera</Text>
        </View>
        {/* Action FAB Mini */}
        <TouchableOpacity style={styles.miniFab} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* NEW BILL MODAL FORM (Form B) */}
      <Modal visible={isAdding} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Top Suggestion Banner */}
            <View style={styles.topSuggestionBanner}>
              <Text style={styles.suggestionText}>Have receipts photo? Say less</Text>
              <TouchableOpacity style={styles.suggestionButton} activeOpacity={0.7}>
                <Text style={styles.suggestionButtonText}>Try Now</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              {/* Field 1: Underline Bill name */}
              <View style={styles.underlineInputWrapper}>
                <TextInput
                  style={styles.underlineInput}
                  placeholder="Enter bills name"
                  placeholderTextColor="#94A3B8"
                  value={billName}
                  onChangeText={setBillName}
                />
              </View>

              {/* Field 2: Category Capsule Dropdown */}
              <View style={styles.capsuleInputWrapper}>
                <Text style={styles.capsuleInputLabel}>Category: {category}</Text>
                <TouchableOpacity 
                  onPress={() => setCategory(category === 'Subscription' ? 'Utility' : 'Subscription')}
                  style={styles.dropdownToggle}
                >
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Field 3: Amount Capsule */}
              <View style={styles.capsuleInputWrapper}>
                <TextInput
                  style={styles.capsuleInput}
                  placeholder="Amount (IDR)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={billAmount}
                  onChangeText={setBillAmount}
                />
              </View>

              {/* Field 4: Billing Day Capsule */}
              <View style={styles.capsuleInputWrapper}>
                <TextInput
                  style={styles.capsuleInput}
                  placeholder="Billing day (e.g. 15)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={billingDay}
                  onChangeText={setBillingDay}
                />
              </View>
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setIsAdding(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddBill}
              >
                <Text style={styles.modalButtonConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 100, // Margin aman agar tidak terpotong tab bar
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  welcomeBanner: {
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLeft: {
    flex: 1,
    marginRight: 8,
  },
  bannerTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  bannerSubtitle: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#0284C7',
    marginTop: 2,
  },
  bannerButton: {
    backgroundColor: '#2F95F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  bannerButtonText: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  billsListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billsListTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  seeAllLink: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#2F95F6',
  },
  billCard: {
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    padding: 14,
    marginBottom: 12,
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  billCardTitle: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  billCardDataRows: {
    flexDirection: 'column',
    gap: 6,
    marginTop: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
  },
  dataValue: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '500',
  },
  dataValueAmount: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '700',
    color: '#2F95F6',
  },
  splitBillsCard: {
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    marginTop: 12,
  },
  splitBillsTitle: {
    alignSelf: 'flex-start',
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  splitBillsContent: {
    alignItems: 'center',
    marginVertical: 8,
  },
  splitBillsMainText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  splitBillsSubText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  miniFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2F95F6',
    position: 'absolute',
    bottom: 16,
    right: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2F95F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  topSuggestionBanner: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  suggestionButton: {
    backgroundColor: '#2F95F6',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  suggestionButtonText: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formContainer: {
    gap: 12,
  },
  underlineInputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 6,
    marginBottom: 8,
  },
  underlineInput: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#1E293B',
  },
  capsuleInputWrapper: {
    height: 44,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capsuleInputLabel: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#1E293B',
  },
  dropdownToggle: {
    padding: 4,
  },
  capsuleInput: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 13,
    color: '#1E293B',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalButtonCancelText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalButtonConfirm: {
    backgroundColor: '#2F95F6',
  },
  modalButtonConfirmText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
});
