import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BillRepository } from '@/features/bills/repository/BillRepository';
import { formatIDR } from '@/core/formatters/currency';
import { getDatabase } from '@/core/database/sqlite';

const billRepository = new BillRepository();

export default function BillsScreen() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSeeAllActive, setIsSeeAllActive] = useState(false);

  // CRUD & Menu States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  // Form States
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billingDay, setBillingDay] = useState('');
  const [category, setCategory] = useState('Subscription'); // "Subscription", "Utility", "Internet", "Rent", "Others"
  const [installment, setInstallment] = useState<'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown Picker States
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isInstallmentPickerOpen, setIsInstallmentPickerOpen] = useState(false);

  // Date Picker Modal States
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);
  const [pickerMonth, setPickerMonth] = useState<Date>(() => new Date());

  const today = useMemo(() => new Date(), []);
  const currentDay = today.getDate();

  // Load Bills from SQLite
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
            frequency: 'monthly' as const,
            billing_day: 15,
            active: true,
          },
          {
            name: 'Electricity Token',
            amount: 250000,
            category: 'Utility',
            frequency: 'monthly' as const,
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

  // Hitung tagihan yang terlambat
  const lateBills = useMemo(() => {
    return bills.filter(b => b.active && b.billing_day < currentDay);
  }, [bills, currentDay]);

  const hasLatePayment = lateBills.length > 0;

  // Saring bills yang ditampilkan (See all toggle)
  const displayedBills = useMemo(() => {
    if (isSeeAllActive) return bills;
    return bills.slice(0, 2);
  }, [bills, isSeeAllActive]);

  // Format estetik untuk tampilan tanggal
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return `${day} ${monthNames[monthIdx]} ${year}`;
  };

  // Kalender mini date picker
  const pickerDaysInMonth = useMemo(() => {
    return new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate();
  }, [pickerMonth]);

  const pickerStartDayOffset = useMemo(() => {
    return new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay();
  }, [pickerMonth]);

  const pickerCalendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < pickerStartDayOffset; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= pickerDaysInMonth; day++) {
      cells.push(day);
    }
    return cells;
  }, [pickerDaysInMonth, pickerStartDayOffset]);

  const pickerMonthStr = useMemo(() => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[pickerMonth.getMonth()]} ${pickerMonth.getFullYear()}`;
  }, [pickerMonth]);

  const handlePrevPickerMonth = () => {
    setPickerMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextPickerMonth = () => {
    setPickerMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const handleSelectPickerDay = (day: number) => {
    const monthStr = String(pickerMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const formattedDate = `${pickerMonth.getFullYear()}-${monthStr}-${dayStr}`;
    
    if (datePickerTarget === 'start') {
      setStartDate(formattedDate);
    } else if (datePickerTarget === 'end') {
      setEndDate(formattedDate);
    }
    
    setDatePickerTarget(null);
  };

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
      const db = await getDatabase();

      if (editingBillId) {
        // Simpan perubahan data luring ke SQLite
        await db.runAsync(
          `UPDATE bills SET 
            name = ?, 
            amount = ?, 
            category = ?, 
            frequency = ?, 
            billing_day = ?, 
            end_date = ?, 
            sync_status = 'pending' 
          WHERE id = ?`,
          [
            billName.trim(),
            amountVal,
            category,
            installment,
            dayVal,
            endDate ? endDate : null,
            editingBillId
          ]
        );
      } else {
        // Tambahkan data tagihan baru ke SQLite
        await billRepository.add('offline-user', {
          name: billName.trim(),
          amount: amountVal,
          category: category,
          frequency: installment,
          billing_day: dayVal,
          active: true,
          endDate: endDate ? endDate : undefined,
        });
      }

      await loadOfflineBills();
      setIsAdding(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save bill:', error);
      Alert.alert('Error', 'Failed to save bill locally');
    }
  };

  const initiateEdit = () => {
    if (!selectedBill) return;

    setEditingBillId(selectedBill.id);
    setBillName(selectedBill.name);
    setBillAmount(String(selectedBill.amount));
    setBillingDay(String(selectedBill.billing_day));
    setCategory(selectedBill.category);
    setInstallment(selectedBill.frequency);
    setEndDate(selectedBill.endDate || '');

    setIsMenuOpen(false);
    setIsAdding(true);
  };

  const confirmDelete = () => {
    if (!selectedBill) return;

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${selectedBill.name}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.runAsync("DELETE FROM bills WHERE id = ?", [selectedBill.id]);
              setIsMenuOpen(false);
              setSelectedBill(null);
              await loadOfflineBills();
            } catch (error) {
              console.error('Failed to delete bill:', error);
              Alert.alert('Error', 'Failed to delete bill');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setEditingBillId(null);
    setBillName('');
    setBillAmount('');
    setBillingDay('');
    setCategory('Subscription');
    setInstallment('monthly');
    setStartDate('');
    setEndDate('');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2F95F6" />
      </View>
    );
  }

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16 }
        ]}
        showsVerticalScrollIndicator={false}
      >
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

        {/* LOGIKA SMART STATUS CARD (WELCOME BACK) DENGAN KONDISI HIDE SAAT SEE ALL */}
        {!isSeeAllActive && (
          <View style={[
            styles.welcomeBanner,
            hasLatePayment ? styles.bannerLateBg : styles.bannerSafeBg
          ]}>
            <View style={styles.bannerLeft}>
              <Text style={[
                styles.bannerTitle,
                hasLatePayment ? styles.bannerLateTitle : styles.bannerSafeTitle
              ]}>
                {hasLatePayment ? 'Late Payment Alert!' : 'Welcome back!'}
              </Text>
              <Text style={[
                styles.bannerSubtitle,
                hasLatePayment ? styles.bannerLateSubtitle : styles.bannerSafeSubtitle
              ]}>
                {hasLatePayment 
                  ? `You have ${lateBills.length} unpaid bill(s) that passed due date!` 
                  : "You didn't have any late payment."}
              </Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.bannerButton, 
                hasLatePayment ? styles.bannerButtonLate : styles.bannerButtonSafe
              ]} 
              activeOpacity={0.8}
              onPress={() => {
                if (hasLatePayment) {
                  setIsSeeAllActive(true); // Memfokuskan ke visual See All
                } else {
                  setIsAdding(true);
                }
              }}
            >
              <Text style={[
                styles.bannerButtonText, 
                hasLatePayment ? styles.bannerButtonTextLate : styles.bannerButtonTextSafe
              ]}>
                {hasLatePayment ? 'Check now' : 'Add now'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RECENT BILLS LIST HEADER ROW DENGAN INTEGRASI BACK BUTTON */}
        <View style={styles.billsListHeaderRow}>
          <View style={styles.recentBillsTitleContainer}>
            {isSeeAllActive && (
              <TouchableOpacity 
                onPress={() => setIsSeeAllActive(false)} 
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={20} color="#333D53" />
              </TouchableOpacity>
            )}
            <Text style={styles.billsListTitle}>Recent Bills</Text>
          </View>
          {!isSeeAllActive && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setIsSeeAllActive(true)}>
              <Text style={styles.seeAllLink}>See all</Text>
            </TouchableOpacity>
          )}
        </View>

        {displayedBills.map(b => (
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
              
              {/* Ellipsis menu button */}
              <TouchableOpacity 
                style={styles.ellipsisButton}
                onPress={() => {
                  setSelectedBill(b);
                  setIsMenuOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#9EB3CD" />
              </TouchableOpacity>
            </View>

            <View style={styles.billCardDataRows}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Amount</Text>
                <Text style={styles.dataValueAmount}>{formatIDR(b.amount)}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Installment</Text>
                <Text style={styles.dataValue}>{b.frequency === 'yearly' ? 'Yearly' : 'Monthly'}</Text>
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

        {/* SPLIT BILLS CONTAINER HIDE SAAT SEE ALL */}
        {!isSeeAllActive && (
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
        )}
      </ScrollView>

      {/* FLOATING ACTION BUTTON (FAB) - TETAP MUNCUL SELAMA SEE ALL */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => {
          resetForm();
          setIsAdding(true);
        }}
      >
        <Ionicons name="receipt-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* NEW BILL MODAL FORM */}
      <Modal visible={isAdding} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBillId ? 'Edit Bill' : 'New Bill'}</Text>
              <TouchableOpacity 
                onPress={() => {
                  setIsAdding(false);
                  resetForm();
                }} 
                style={styles.closeModalButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#333D53" />
              </TouchableOpacity>
            </View>

            {/* Top Suggestion Banner */}
            <View style={styles.topSuggestionBanner}>
              <Text style={styles.suggestionText}>Have receipts photo? Say less</Text>
              <TouchableOpacity style={styles.suggestionButton} activeOpacity={0.7}>
                <Text style={styles.suggestionButtonText}>Try Now</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
              <View style={styles.formContainer}>
                
                {/* a. Nama Tagihan: Underline Input */}
                <Text style={styles.fieldLabel}>Bill Name</Text>
                <View style={styles.underlineInputWrapper}>
                  <TextInput
                    style={styles.underlineInput}
                    placeholder="Enter bills name"
                    placeholderTextColor="#94A3B8"
                    value={billName}
                    onChangeText={setBillName}
                  />
                </View>

                {/* b. Bill Type (Category): Dropdown Selector */}
                <Text style={styles.fieldLabel}>Bill Type</Text>
                <TouchableOpacity 
                  style={[styles.capsuleInputWrapper, styles.capsuleInputRow]}
                  activeOpacity={0.7}
                  onPress={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
                >
                  <Text style={styles.capsuleInputText}>{category}</Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>

                {/* Dropdown Options for Category */}
                {isCategoryPickerOpen && (
                  <View style={styles.dropdownOptionsContainer}>
                    {['Subscription', 'Utility', 'Internet', 'Rent', 'Others'].map(cat => (
                      <TouchableOpacity 
                        key={cat} 
                        style={styles.dropdownOption}
                        onPress={() => {
                          setCategory(cat);
                          setIsCategoryPickerOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, category === cat && styles.dropdownOptionTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* c. Amount (IDR): Capsule Input */}
                <Text style={styles.fieldLabel}>Amount (IDR)</Text>
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

                {/* d. Installment (Frequency): Capsule Input dropdown */}
                <Text style={styles.fieldLabel}>Installment Cycle</Text>
                <TouchableOpacity 
                  style={[styles.capsuleInputWrapper, styles.capsuleInputRow]}
                  activeOpacity={0.7}
                  onPress={() => setIsInstallmentPickerOpen(!isInstallmentPickerOpen)}
                >
                  <Text style={styles.capsuleInputText}>
                    {installment === 'yearly' ? 'Yearly' : 'Monthly'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>

                {/* Dropdown Options for Installment */}
                {isInstallmentPickerOpen && (
                  <View style={styles.dropdownOptionsContainer}>
                    {[
                      { id: 'monthly', label: 'Monthly' },
                      { id: 'yearly', label: 'Yearly' }
                    ].map(inst => (
                      <TouchableOpacity 
                        key={inst.id} 
                        style={styles.dropdownOption}
                        onPress={() => {
                          setInstallment(inst.id as any);
                          setIsInstallmentPickerOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, installment === inst.id && styles.dropdownOptionTextActive]}>
                          {inst.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* e. Billing Day & Cycle Dropdown side-by-side */}
                <Text style={styles.fieldLabel}>Billing Day & Cycle</Text>
                <View style={styles.rowFields}>
                  <View style={[styles.capsuleInputWrapper, { flex: 1 }]}>
                    <TextInput
                      style={styles.capsuleInput}
                      placeholder="Billing Day (1-31)"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={billingDay}
                      onChangeText={setBillingDay}
                    />
                  </View>
                  <View style={[styles.capsuleInputWrapper, { width: 100, marginLeft: 10 }]}>
                    <Text style={styles.capsuleInputText}>
                      {installment === 'yearly' ? 'Year' : 'Month'}
                    </Text>
                  </View>
                </View>

                {/* f. Start & End Date Capsule Pickers */}
                <View style={styles.rowFields}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Start Date</Text>
                    <TouchableOpacity 
                      style={[styles.capsuleInputWrapper, styles.capsuleInputRow]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setDatePickerTarget('start');
                        setPickerMonth(new Date());
                      }}
                    >
                      <Text style={[styles.capsuleInputText, !startDate && { color: '#94A3B8' }]}>
                        {startDate ? formatDateDisplay(startDate) : 'Start Date'}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.fieldLabel}>End Date (Optional)</Text>
                    <TouchableOpacity 
                      style={[styles.capsuleInputWrapper, styles.capsuleInputRow]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setDatePickerTarget('end');
                        setPickerMonth(new Date());
                      }}
                    >
                      <Text style={[styles.capsuleInputText, !endDate && { color: '#94A3B8' }]}>
                        {endDate ? formatDateDisplay(endDate) : 'End Date'}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

              </View>
            </ScrollView>

            {/* Tombol Confirm Full-width */}
            <TouchableOpacity 
              style={styles.confirmButton} 
              activeOpacity={0.8}
              onPress={handleAddBill}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* CUSTOM CALENDAR PICKER MODAL */}
      <Modal visible={datePickerTarget !== null} animationType="fade" transparent>
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContent}>
            {/* Header */}
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                Select {datePickerTarget === 'start' ? 'Start Date' : 'End Date'}
              </Text>
              <TouchableOpacity 
                onPress={() => setDatePickerTarget(null)}
                style={styles.closePickerButton}
              >
                <Ionicons name="close" size={18} color="#333D53" />
              </TouchableOpacity>
            </View>

            {/* Picker Month Navigation */}
            <View style={styles.pickerMonthRow}>
              <TouchableOpacity onPress={handlePrevPickerMonth} style={styles.pickerArrow}>
                <Ionicons name="chevron-back" size={16} color="#333D53" />
              </TouchableOpacity>
              <Text style={styles.pickerMonthTitle}>{pickerMonthStr}</Text>
              <TouchableOpacity onPress={handleNextPickerMonth} style={styles.pickerArrow}>
                <Ionicons name="chevron-forward" size={16} color="#333D53" />
              </TouchableOpacity>
            </View>

            {/* Calendar Grid */}
            <View style={styles.pickerGridContainer}>
              <View style={styles.pickerGridHeader}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <Text key={d} style={styles.pickerGridHeaderCell}>{d}</Text>
                ))}
              </View>

              <View style={styles.pickerDaysGrid}>
                {pickerCalendarCells.map((day, idx) => {
                  const targetDate = datePickerTarget === 'start' ? startDate : endDate;
                  const isSelected = day ? targetDate === `${pickerMonth.getFullYear()}-${String(pickerMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : false;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.pickerDayCellWrapper}
                      disabled={!day}
                      onPress={() => day && handleSelectPickerDay(day)}
                      activeOpacity={day ? 0.7 : 1}
                    >
                      {day ? (
                        <View style={[styles.pickerDayCell, isSelected && styles.pickerDayCellSelected]}>
                          <Text style={[styles.pickerDayText, isSelected && styles.pickerDayTextSelected]}>
                            {day}
                          </Text>
                        </View>
                      ) : (
                        <View />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* KUSTOM MODAL MENU KARTU TAGIHAN */}
      <Modal visible={isMenuOpen} animationType="fade" transparent>
        <View style={styles.cardMenuOverlay}>
          <View style={styles.cardMenuContainer}>
            <TouchableOpacity 
              style={styles.closeMenuButton}
              onPress={() => {
                setIsMenuOpen(false);
                setSelectedBill(null);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>

            <Text style={styles.cardMenuTitle}>Bill Options</Text>
            <Text style={styles.cardMenuSubtitle}>
              Choose action for "{selectedBill ? selectedBill.name : ''}"
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
                <Text style={styles.cardDeleteButtonText}>Delete Bill</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.cardActionButton, styles.cardCancelButton]}
                onPress={() => {
                  setIsMenuOpen(false);
                  setSelectedBill(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cardCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120, // Margin aman agar tidak terpotong tab bar
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
    marginBottom: 20,
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
  welcomeBanner: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  bannerSafeBg: {
    backgroundColor: '#F8F9FC',
    borderColor: '#EEF1F6',
  },
  bannerLateBg: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEE2E2',
  },
  bannerLeft: {
    flex: 1,
    marginRight: 8,
  },
  bannerTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontFamily: 'System',
    fontSize: 11,
    marginTop: 2,
  },
  bannerSafeTitle: {
    color: '#333D53',
  },
  bannerLateTitle: {
    color: '#EF4444',
  },
  bannerSafeSubtitle: {
    color: '#64748B',
  },
  bannerLateSubtitle: {
    color: '#EF4444',
    fontWeight: '500',
  },
  bannerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerButtonLate: {
    backgroundColor: '#991B1B', // Solid dark red
    borderColor: '#991B1B',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  bannerButtonTextLate: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  bannerButtonSafe: {
    backgroundColor: '#3A86FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  bannerButtonTextSafe: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },
  bannerButtonText: {
    fontFamily: 'System',
  },
  billsListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentBillsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  billsListTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '700',
    color: '#333D53',
  },
  seeAllLink: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#3A86FF',
    fontWeight: '600',
  },
  billCard: {
    borderRadius: 16,
    backgroundColor: '#F8F9FC',
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF1F6',
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
    color: '#333D53',
  },
  ellipsisButton: {
    marginLeft: 'auto',
    padding: 6,
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
    color: '#333D53',
    fontWeight: '500',
  },
  dataValueAmount: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '700',
    color: '#3A86FF',
  },
  splitBillsCard: {
    borderRadius: 20,
    backgroundColor: '#F8F9FC',
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EEF1F6',
  },
  splitBillsTitle: {
    alignSelf: 'flex-start',
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#333D53',
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
    backgroundColor: '#3A86FF',
    position: 'absolute',
    bottom: 16,
    right: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3A86FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3A86FF',
    position: 'absolute',
    bottom: 90,
    right: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3A86FF',
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
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '700',
    color: '#333D53',
  },
  closeModalButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF1F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSuggestionBanner: {
    backgroundColor: '#FAFBFD',
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7EAF3',
    marginBottom: 8,
  },
  suggestionText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  suggestionButton: {
    backgroundColor: '#3A86FF',
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
  formScroll: {
    paddingVertical: 8,
  },
  formContainer: {
    gap: 12,
  },
  fieldLabel: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  underlineInputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#9EB3CD',
    paddingBottom: 6,
    marginBottom: 4,
  },
  underlineInput: {
    fontFamily: 'System',
    fontSize: 14,
    color: '#333D53',
  },
  capsuleInputWrapper: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF1F6',
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginTop: 2,
  },
  capsuleInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capsuleInputText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#333D53',
  },
  capsuleInput: {
    flex: 1,
    fontFamily: 'System',
    fontSize: 13,
    color: '#333D53',
  },
  dropdownOptionsContainer: {
    backgroundColor: '#FAFBFD',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E7EAF3',
    gap: 4,
  },
  dropdownOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownOptionText: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dropdownOptionTextActive: {
    color: '#3A86FF',
    fontWeight: '700',
  },
  rowFields: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmButton: {
    height: 50,
    borderRadius: 24,
    backgroundColor: '#3A86FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // DATE PICKER MODAL STYLES
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(51, 61, 83, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  datePickerContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#333D53',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F6',
  },
  datePickerTitle: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '700',
    color: '#333D53',
  },
  closePickerButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF1F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  pickerArrow: {
    padding: 4,
  },
  pickerMonthTitle: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '700',
    color: '#333D53',
  },
  pickerGridContainer: {
    borderWidth: 1,
    borderColor: '#EEF1F6',
    borderRadius: 16,
    padding: 10,
    backgroundColor: '#FAFBFD',
  },
  pickerGridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pickerGridHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  pickerDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickerDayCellWrapper: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 1,
  },
  pickerDayCell: {
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  pickerDayCellSelected: {
    backgroundColor: '#3A86FF',
  },
  pickerDayText: {
    fontFamily: 'System',
    fontSize: 11,
    color: '#333D53',
    fontWeight: '500',
  },
  pickerDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // CARD OPTIONS MENU STYLES
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
});
