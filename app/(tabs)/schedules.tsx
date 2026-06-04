import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '@/core/database/sqlite';
import DataSettingsSheet from '@/components/DataSettingsSheet';
import { scheduleCalendarEventReminder } from '@/core/services/notificationService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface Note {
  id: string;
  note: string;
  category: 'urgent' | 'reminder' | 'daily';
  date: string; // Format: YYYY-MM-DD
  due_date?: string; // Format: YYYY-MM-DD
  reminder_before?: string;
}

export default function SchedulesScreen() {
  // Objek tanggal hari ini (Today) berdasarkan local device time
  const todayDateObj = useMemo(() => {
    const now = new Date();
    return {
      day: now.getDate(),
      month: now.getMonth(), // 0-11
      year: now.getFullYear()
    };
  }, []);

  // Melacak bulan & tahun aktif berbasis objek Date
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [notes, setNotes] = useState<Note[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [totalTxsCount, setTotalTxsCount] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());

  // Input States untuk Notes
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState<'urgent' | 'reminder' | 'daily'>('daily');
  const [dueDate, setDueDate] = useState(''); // Format: YYYY-MM-DD
  const [reminderValue, setReminderValue] = useState('15');
  const [reminderUnit, setReminderUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  // Date Picker States
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(() => new Date());

  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const handleSelectYear = (year: number) => {
    setCurrentMonth(prev => new Date(year, prev.getMonth(), 1));
    setIsYearPickerOpen(false);
  };

  // Reset form inputs
  const resetNoteForm = () => {
    setNewNote('');
    setNoteCategory('daily');
    setDueDate('');
    setReminderValue('15');
    setReminderUnit('minutes');
  };

  // Navigasi Bulan dinamis
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Logika Date Picker kustom
  const handlePrevPickerMonth = () => {
    setPickerMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextPickerMonth = () => {
    setPickerMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectPickerDay = (day: number) => {
    const month = String(pickerMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    setDueDate(`${pickerMonth.getFullYear()}-${month}-${dayStr}`);
    setIsDatePickerOpen(false);
  };

  // Ambil data hari dalam pickerMonth
  const pickerDaysInMonth = useMemo(() => {
    return new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate();
  }, [pickerMonth]);

  const pickerStartDayOffset = useMemo(() => {
    return new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay();
  }, [pickerMonth]);

  const pickerCalendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < pickerStartDayOffset; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= pickerDaysInMonth; day++) {
      cells.push(day);
    }
    return cells;
  }, [pickerDaysInMonth, pickerStartDayOffset]);

  const pickerMonthStr = useMemo(() => {
    return `${MONTH_NAMES[pickerMonth.getMonth()]} ${pickerMonth.getFullYear()}`;
  }, [pickerMonth]);

  const formattedDueDateDisplay = useMemo(() => {
    if (!dueDate) return 'Select due date';
    const dateObj = new Date(dueDate);
    return `${dateObj.getDate()} ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  }, [dueDate]);

  // Hitung jumlah hari dalam bulan aktif
  const daysInMonth = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  }, [currentMonth]);

  // Mengambil index hari pertama dalam bulan aktif (0: Sun, 1: Mon, dst)
  const startDayOffset = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  }, [currentMonth]);

  // Nama header bulan dinamis
  const formattedMonthStr = useMemo(() => {
    return `${MONTH_NAMES[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  }, [currentMonth]);

  // Pola pencarian YYYY-MM untuk SQLite
  const formattedYearMonth = useMemo(() => {
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    return `${currentMonth.getFullYear()}-${month}`;
  }, [currentMonth]);

  const [dbReady, setDbReady] = useState(false);

  // Memuat data notes secara dinamis dari SQLite berdasarkan bulan aktif
  const loadOfflineData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const yearMonthPattern = `${formattedYearMonth}-%`;

      // Query total transaction count for Settings stats
      const txCountRows = await db.getAllAsync<any>(
        "SELECT COUNT(*) as count FROM transactions"
      );
      const txCount = txCountRows[0]?.count || 0;
      setTotalTxsCount(txCount);

      const rows = await db.getAllAsync<any>(
        "SELECT * FROM schedules WHERE user_id = ? AND date LIKE ? ORDER BY date ASC, id ASC",
        ['offline-user', yearMonthPattern]
      );

      if (rows) {
        setNotes(rows.map(r => ({
          id: r.id,
          note: r.note,
          category: r.category as any,
          date: r.date,
          due_date: r.due_date || undefined,
          reminder_before: r.reminder_before || undefined,
        })));
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }, [formattedYearMonth]);

  // Inisialisasi tabel schedules di SQLite secara lazily
  const initNotesTable = useCallback(async () => {
    try {
      const db = await getDatabase();
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schedules (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          note TEXT NOT NULL,
          category TEXT NOT NULL,
          date TEXT NOT NULL,
          due_date TEXT,
          reminder_before TEXT
        );
      `);
      setDbReady(true);
    } catch (error) {
      console.error('Failed to initialize schedules table:', error);
    }
  }, []);

  useEffect(() => {
    initNotesTable();
  }, [initNotesTable]);

  // Trigger load kembali setiap kali currentMonth berubah (efek navigasi bulan) atau dbReady berubah
  useEffect(() => {
    if (dbReady) {
      loadOfflineData();
    }
  }, [loadOfflineData, dbReady]);



  // Menambahkan note ke SQLite secara offline
  const handleAddEvent = async () => {
    if (!newNote.trim()) {
      Alert.alert('Error', 'Please enter note details');
      return;
    }

    if (noteCategory === 'reminder' && !dueDate) {
      Alert.alert('Error', 'Please select due date');
      return;
    }

    try {
      const db = await getDatabase();
      const newId = String(Date.now());
      
      const dayStr = String(selectedDay).padStart(2, '0');
      const noteDateStr = `${formattedYearMonth}-${dayStr}`;

      let reminderSeconds = 0;
      let reminderText = '15 minutes';
      let triggerTimestamp = '';

      if (noteCategory === 'reminder') {
        const val = parseInt(reminderValue, 10) || 0;
        let factor = 60; // minutes
        if (reminderUnit === 'hours') factor = 3600;
        else if (reminderUnit === 'days') factor = 86400;
        reminderSeconds = val * factor;
        reminderText = `${val} ${reminderUnit}`;

        if (dueDate) {
          const [yr, mo, dy] = dueDate.split('-').map(Number);
          const eventTime = new Date(yr, mo - 1, dy, 9, 0, 0, 0);
          const triggerMs = eventTime.getTime() - (reminderSeconds * 1000);
          triggerTimestamp = String(triggerMs);
        }
      }

      await db.runAsync(
        `INSERT INTO schedules (id, user_id, note, category, date, due_date, reminder_before) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          'offline-user',
          newNote.trim(),
          noteCategory,
          noteDateStr,
          noteCategory === 'reminder' ? dueDate : '',
          noteCategory === 'reminder' ? reminderText : ''
        ]
      );

      if (noteCategory === 'reminder') {
        await scheduleCalendarEventReminder({
          id: newId,
          note: newNote.trim(),
          category: noteCategory,
          date: noteDateStr,
          due_date: noteCategory === 'reminder' ? dueDate : '',
          reminder_before: noteCategory === 'reminder' ? reminderText : '',
          trigger_timestamp: triggerTimestamp,
          reminder_text: reminderText,
        });
      }

      await loadOfflineData();
      setIsAdding(false);
      resetNoteForm();
    } catch (error) {
      console.error('Failed to save note:', error);
      Alert.alert('Error', 'Failed to save note');
    }
  };

  // Menghapus note dari SQLite
  const handleDeleteNote = (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.runAsync("DELETE FROM schedules WHERE id = ?", [id]);
              await loadOfflineData();
            } catch (error) {
              console.error('Failed to delete note:', error);
              Alert.alert('Error', 'Failed to delete schedule');
            }
          }
        }
      ]
    );
  };

  // Pemetaan cells kalender secara dinamis
  const calendarCells = useMemo(() => {
    const cells = [];
    // Cells kosong di awal (offset hari)
    for (let i = 0; i < startDayOffset; i++) {
      cells.push({ day: null, hasEvent: false, eventType: null, fullDate: null });
    }
    // Days cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const fullDateStr = `${formattedYearMonth}-${dayStr}`;
      
      const dayNotes = notes.filter(n => n.date === fullDateStr);
      
      // Pilih dot indikator tercabang (urgent diprioritaskan, disusul reminder)
      let type: 'urgent' | 'reminder' | 'daily' | null = null;
      if (dayNotes.length > 0) {
        if (dayNotes.some(n => n.category === 'urgent')) type = 'urgent';
        else if (dayNotes.some(n => n.category === 'reminder')) type = 'reminder';
        else type = 'daily';
      }

      cells.push({
        day,
        hasEvent: dayNotes.length > 0,
        eventType: type,
        fullDate: fullDateStr
      });
    }
    return cells;
  }, [notes, daysInMonth, startDayOffset, formattedYearMonth]);

  // Notes yang tersaring untuk tanggal aktif terpilih
  const selectedDayEvents = useMemo(() => {
    const dayStr = String(selectedDay).padStart(2, '0');
    const fullDateStr = `${formattedYearMonth}-${dayStr}`;
    return notes.filter(n => n.date === fullDateStr);
  }, [notes, selectedDay, formattedYearMonth]);

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
          <Text style={styles.headerTitle}>Schedules</Text>
          <TouchableOpacity 
            style={styles.compactSettingsButton} 
            activeOpacity={0.7}
            onPress={() => setIsSettingsOpen(true)}
          >
            <Ionicons name="settings-outline" size={22} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* HEADER BULAN DINAMIS DENGAN NAVIGASI */}
        <View style={styles.monthHeader}>
          <TouchableOpacity activeOpacity={0.7} onPress={handlePrevMonth} style={styles.arrowButton}>
            <Ionicons name="chevron-back" size={22} color="#333D53" />
          </TouchableOpacity>
          <View style={styles.monthYearTitleContainer}>
            <Text style={styles.monthTitleText}>
              {MONTH_NAMES[currentMonth.getMonth()]}
            </Text>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => setIsYearPickerOpen(true)}
              style={styles.yearPickerTrigger}
            >
              <Text style={styles.yearTitleText}>{currentMonth.getFullYear()}</Text>
              <Ionicons name="chevron-down" size={12} color="#333D53" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={handleNextMonth} style={styles.arrowButton}>
            <Ionicons name="chevron-forward" size={22} color="#333D53" />
          </TouchableOpacity>
        </View>

        {/* CUSTOM CALENDAR GRID */}
        <View style={styles.calendarCard}>
          {/* Grid Header */}
          <View style={styles.gridHeaderRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
              <Text key={dayName} style={styles.gridHeaderCell}>{dayName}</Text>
            ))}
          </View>

          {/* Days Cell Grid */}
          <View style={styles.daysGrid}>
            {calendarCells.map((cell, idx) => {
              const isSelected = cell.day === selectedDay;
              const isActualToday = cell.day === todayDateObj.day &&
                                    currentMonth.getMonth() === todayDateObj.month &&
                                    currentMonth.getFullYear() === todayDateObj.year;
              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.dayCellWrapper}
                  activeOpacity={cell.day ? 0.7 : 1}
                  disabled={!cell.day}
                  onPress={() => cell.day && setSelectedDay(cell.day)}
                >
                  {cell.day ? (
                    <View style={[
                      styles.dayCell,
                      isActualToday && styles.actualTodayCell,
                      isSelected && styles.selectedCell,
                      (isActualToday && isSelected) && { backgroundColor: '#3A86FF' }
                    ]}>
                      <Text style={[
                        styles.dayText,
                        isActualToday && styles.actualTodayText,
                        isSelected && styles.selectedText,
                        (isActualToday && isSelected) && { color: '#FFFFFF' }
                      ]}>
                        {cell.day}
                      </Text>
                      {cell.hasEvent && !isSelected && (
                        <View style={[
                          styles.eventIndicator,
                          cell.eventType === 'urgent' && styles.eventIndicatorUrgent,
                          cell.eventType === 'reminder' && styles.eventIndicatorReminder,
                          cell.eventType === 'daily' && styles.eventIndicatorDaily,
                        ]} />
                      )}
                    </View>
                  ) : (
                    <View style={styles.dayCell} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SCHEDULES & NOTES SECTION */}
        <View style={styles.schedulesSection}>
          <View style={styles.schedulesHeaderRow}>
            <Text style={styles.schedulesTitle}>Schedules ({formattedMonthStr} - Day {selectedDay})</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setIsAdding(true)}>
              <Text style={styles.addScheduleLink}>Tap to add new schedule</Text>
            </TouchableOpacity>
          </View>

          {/* Active Schedules Row list */}
          <View style={styles.eventsList}>
            {selectedDayEvents.map(e => {
              let badgeBg = '#3A86FF'; // daily (Default)
              if (e.category === 'urgent') badgeBg = '#EF4444';
              else if (e.category === 'reminder') badgeBg = '#F59E0B';

              return (
                <View key={e.id} style={styles.eventRow}>
                  <View style={[styles.eventMarkerBadge, { backgroundColor: badgeBg }]}>
                    <Text style={styles.eventMarkerText}>{e.category.toUpperCase()}</Text>
                  </View>
                  <View style={styles.eventNoteTextWrapper}>
                    <Text style={styles.eventNoteText}>{e.note}</Text>
                    {e.category === 'reminder' && e.due_date && (
                      <Text style={styles.eventDueText}>
                        Due: {e.due_date} {e.reminder_before ? `• Alert: ${e.reminder_before} prior` : ''}
                      </Text>
                    )}
                  </View>
                  {/* Delete button */}
                  <TouchableOpacity onPress={() => handleDeleteNote(e.id)} style={styles.deleteNoteButton}>
                    <Ionicons name="trash-outline" size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>
              );
            })}

            {selectedDayEvents.length === 0 && (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateText}>No schedules for this day</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ADD SCHEDULE MODAL */}
      <Modal visible={isAdding} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setIsAdding(false);
                  resetNoteForm();
                }}
                style={styles.backCloseButton}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#333D53" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Schedule for Day {selectedDay}</Text>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              scrollEnabled={false} 
              style={{ overflow: 'hidden' }} 
              contentContainerStyle={styles.modalFormScroll}
            >
              <View style={styles.modalForm}>
                <Text style={styles.modalSubTitle}>Note Details</Text>
                <View style={styles.capsuleInputWrapper}>
                  <TextInput
                    style={styles.capsuleInput}
                    placeholder="e.g. Internet Subscription Payment due..."
                    placeholderTextColor="#94A3B8"
                    value={newNote}
                    onChangeText={setNewNote}
                  />
                </View>

                {/* Category Selector Chips */}
                <Text style={styles.modalSubTitle}>Category</Text>
                <View style={styles.categoryChipsContainer}>
                  {(['urgent', 'reminder', 'daily'] as const).map(cat => {
                    const isActive = noteCategory === cat;
                    let activeColor = '#3A86FF'; // daily
                    if (cat === 'urgent') activeColor = '#EF4444';
                    if (cat === 'reminder') activeColor = '#F59E0B';
                    
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          isActive && { backgroundColor: activeColor, borderColor: activeColor }
                        ]}
                        onPress={() => setNoteCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                          {cat.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Conditional fields for Reminder category */}
                {noteCategory === 'reminder' && (
                  <View style={styles.conditionalFormStack}>
                    <Text style={styles.modalSubTitle}>Due Date</Text>
                    <TouchableOpacity 
                      style={[styles.capsuleInputWrapper, styles.capsuleInputRow]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setPickerMonth(new Date(currentMonth));
                        setIsDatePickerOpen(true);
                      }}
                    >
                      <Text style={[styles.capsuleInput, !dueDate && { color: '#94A3B8' }]}>
                        {formattedDueDateDisplay}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color="#64748B" />
                    </TouchableOpacity>

                    <Text style={styles.modalSubTitle}>Reminder Alert</Text>
                    <View style={styles.reminderInputRow}>
                      <View style={[styles.capsuleInputWrapper, { flex: 1, marginTop: 0 }]}>
                        <TextInput
                          style={styles.capsuleInput}
                          placeholder="15"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          maxLength={2}
                          value={reminderValue}
                          onChangeText={setReminderValue}
                        />
                      </View>
                      
                      <View style={styles.unitChipsRow}>
                        {(['minutes', 'hours', 'days'] as const).map(unit => {
                          const isSelected = reminderUnit === unit;
                          const label = unit.charAt(0).toUpperCase() + unit.slice(1);
                          return (
                            <TouchableOpacity
                              key={unit}
                              style={[
                                styles.unitChip,
                                isSelected ? styles.unitChipActive : styles.unitChipInactive
                              ]}
                              onPress={() => setReminderUnit(unit)}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.unitChipText,
                                isSelected ? styles.unitChipTextActive : styles.unitChipTextInactive
                              ]}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setIsAdding(false);
                  resetNoteForm();
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddEvent}
              >
                <Text style={styles.modalButtonConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* CUSTOM CALENDAR PICKER MODAL */}
      <Modal visible={isDatePickerOpen} animationType="fade" transparent>
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContent}>
            {/* Header */}
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Due Date</Text>
              <TouchableOpacity 
                onPress={() => setIsDatePickerOpen(false)}
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
              {/* Header Days */}
              <View style={styles.pickerGridHeader}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <Text key={d} style={styles.pickerGridHeaderCell}>{d}</Text>
                ))}
              </View>

              {/* Grid Cells */}
              <View style={styles.pickerDaysGrid}>
                {pickerCalendarCells.map((day, idx) => {
                  const isSelected = day ? dueDate === `${pickerMonth.getFullYear()}-${String(pickerMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : false;

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

      {/* YEAR QUICK-PICKER OVERLAY */}
      <Modal visible={isYearPickerOpen} animationType="fade" transparent onRequestClose={() => setIsYearPickerOpen(false)}>
        <TouchableOpacity 
          style={styles.yearPickerOverlay} 
          activeOpacity={1} 
          onPress={() => setIsYearPickerOpen(false)}
        >
          <View style={styles.yearPickerContent}>
            <Text style={styles.yearPickerTitle}>Select Year</Text>
            <ScrollView style={styles.yearPickerScroll} showsVerticalScrollIndicator={false}>
              {years.map(year => {
                const isSelected = currentMonth.getFullYear() === year;
                return (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearItem,
                      isSelected && styles.yearItemSelected
                    ]}
                    onPress={() => handleSelectYear(year)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.yearItemText,
                      isSelected && styles.yearItemTextSelected
                    ]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* SETTINGS MODAL */}
      <DataSettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataChange={loadOfflineData}
      />
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
    paddingBottom: 100, // Margin aman agar tidak terpotong tab bar
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  compactProfileButton: {
    padding: 2,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  compactAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  arrowButton: {
    padding: 6,
  },
  monthTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700',
    color: '#333D53',
  },
  monthTitleText: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700',
    color: '#333D53',
  },
  yearPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF1F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  yearTitleText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#333D53',
  },
  monthYearTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridHeaderCell: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrapper: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayCell: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
    position: 'relative',
  },
  actualTodayCell: {
    borderWidth: 1.5,
    borderColor: '#3A86FF',
  },
  actualTodayText: {
    color: '#3A86FF',
    fontWeight: '700',
  },
  selectedCell: {
    backgroundColor: '#333D53',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#333D53',
    fontWeight: '500',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventIndicatorUrgent: {
    backgroundColor: '#EF4444',
  },
  eventIndicatorReminder: {
    backgroundColor: '#F59E0B',
  },
  eventIndicatorDaily: {
    backgroundColor: '#3A86FF',
  },
  schedulesSection: {
    marginTop: 8,
  },
  schedulesHeaderRow: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  schedulesTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#333D53',
  },
  addScheduleLink: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#3A86FF',
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  eventsList: {
    gap: 8,
  },
  eventRow: {
    borderRadius: 12,
    backgroundColor: '#F8F9FC',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F6',
  },
  eventMarkerBadge: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  eventMarkerText: {
    fontFamily: 'System',
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventNoteTextWrapper: {
    flex: 1,
  },
  eventNoteText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '600',
    color: '#333D53',
  },
  eventDueText: {
    fontFamily: 'System',
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  deleteNoteButton: {
    padding: 6,
    marginLeft: 6,
  },
  emptyStateCard: {
    borderRadius: 16,
    backgroundColor: '#F8F9FC',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F6',
  },
  emptyStateText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 600,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  modalTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '700',
    color: '#333D53',
  },
  backCloseButton: {
    padding: 4,
  },
  closeModalButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF1F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFormScroll: {
    paddingVertical: 12,
    paddingBottom: 24,
  },
  modalForm: {
    gap: 12,
  },
  modalSubTitle: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#EEF1F6',
    borderWidth: 1,
    borderColor: '#EEF1F6',
  },
  categoryChipText: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  conditionalFormStack: {
    gap: 12,
    marginTop: 8,
  },
  capsuleInputWrapper: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF1F6',
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginTop: 4,
  },
  capsuleInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capsuleInput: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#1E293B',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#EEF1F6',
  },
  modalButtonCancelText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalButtonConfirm: {
    backgroundColor: '#3A86FF',
  },
  modalButtonConfirmText: {
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
    position: 'relative',
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
  compactSettingsButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#EEF1F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  unitChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  unitChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitChipActive: {
    backgroundColor: '#3A86FF',
    borderColor: '#3A86FF',
  },
  unitChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  unitChipText: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '600',
  },
  unitChipTextActive: {
    color: '#FFFFFF',
  },
  unitChipTextInactive: {
    color: '#64748B',
  },
  yearPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearPickerContent: {
    width: 200,
    maxHeight: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: '#333D53',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  yearPickerTitle: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#333D53',
    textAlign: 'center',
    marginBottom: 12,
  },
  yearPickerScroll: {
    flexGrow: 0,
  },
  yearItem: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  yearItemSelected: {
    backgroundColor: '#3A86FF',
  },
  yearItemText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  yearItemTextSelected: {
    color: '#FFFFFF',
  },
});
