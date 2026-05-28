import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Event {
  id: string;
  date: number; // day of month
  note: string;
  type: 'Bill' | 'Note';
}

export default function SchedulesScreen() {
  const [currentMonth, setCurrentMonth] = useState('June 2026');
  const [events, setEvents] = useState<Event[]>([
    { id: '1', date: 15, note: "Buy something for mom's birthday", type: 'Note' },
    { id: '2', date: 10, note: "Internet Subscription Payment due", type: 'Bill' },
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(28); // Today is 28

  const daysInMonth = 30; // June has 30 days
  const startDayOffset = 1; // June 2026 starts on Monday (1 offset if Sunday is 0)

  // Generate calendar days
  const calendarCells = useMemo(() => {
    const cells = [];
    // Empty cells for offset
    for (let i = 0; i < startDayOffset; i++) {
      cells.push({ day: null, hasEvent: false, eventType: null });
    }
    // Days cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = events.filter(e => e.date === day);
      cells.push({
        day,
        hasEvent: dayEvents.length > 0,
        eventType: dayEvents.length > 0 ? dayEvents[0].type : null,
      });
    }
    return cells;
  }, [events]);

  const handleAddEvent = () => {
    if (!newNote.trim()) {
      Alert.alert('Error', 'Please enter your event note');
      return;
    }

    const newEvent: Event = {
      id: String(Date.now()),
      date: selectedDay,
      note: newNote,
      type: 'Note',
    };

    setEvents(prev => [...prev, newEvent]);
    setIsAdding(false);
    setNewNote('');
  };

  const selectedDayEvents = useMemo(() => {
    return events.filter(e => e.date === selectedDay);
  }, [events, selectedDay]);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16 }
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER BULAN */}
      <View style={styles.monthHeader}>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#64748B" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{currentMonth}</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color="#64748B" />
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
            const isToday = cell.day === selectedDay;
            return (
              <TouchableOpacity
                key={idx}
                style={styles.dayCellWrapper}
                activeOpacity={cell.day ? 0.7 : 1}
                disabled={!cell.day}
                onPress={() => cell.day && setSelectedDay(cell.day)}
              >
                {cell.day ? (
                  <View style={[styles.dayCell, isToday && styles.todayCell]}>
                    <Text style={[styles.dayText, isToday && styles.todayText]}>
                      {cell.day}
                    </Text>
                    {cell.hasEvent && !isToday && (
                      <View style={[
                        styles.eventIndicator,
                        cell.eventType === 'Bill' ? styles.eventIndicatorBill : styles.eventIndicatorNote
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
          <Text style={styles.schedulesTitle}>Schedules</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setIsAdding(true)}>
            <Text style={styles.addScheduleLink}>Tap to add new schedules</Text>
          </TouchableOpacity>
        </View>

        {/* Active Schedules Row list */}
        <View style={styles.eventsList}>
          {selectedDayEvents.map(e => (
            <View key={e.id} style={styles.eventRow}>
              <View style={[
                styles.eventMarkerBadge, 
                { backgroundColor: e.type === 'Bill' ? '#F59E0B' : '#2F95F6' }
              ]}>
                <Text style={styles.eventMarkerText}>{e.type}</Text>
              </View>
              <Text style={styles.eventNoteText}>{e.note}</Text>
            </View>
          ))}

          {selectedDayEvents.length === 0 && (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateText}>No Event added</Text>
            </View>
          )}
        </View>
      </View>

      {/* ADD SCHEDULE MODAL */}
      <Modal visible={isAdding} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Schedule for Day {selectedDay}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Buy something for mom's birthday..."
              placeholderTextColor="#94A3B8"
              value={newNote}
              onChangeText={setNewNote}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setIsAdding(false)}
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  monthTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  calendarCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    // Soft shadow
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
    fontWeight: '500',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellWrapper: {
    width: '14.28%', // 7 columns grid
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
  todayCell: {
    backgroundColor: '#2F95F6',
  },
  dayText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#1E293B',
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventIndicatorBill: {
    backgroundColor: '#F59E0B',
  },
  eventIndicatorNote: {
    backgroundColor: '#2F95F6',
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
    color: '#1E293B',
  },
  addScheduleLink: {
    fontFamily: 'System',
    fontSize: 12,
    color: '#2F95F6',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  eventsList: {
    gap: 8,
  },
  eventRow: {
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventMarkerBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  eventMarkerText: {
    fontFamily: 'System',
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventNoteText: {
    fontFamily: 'System',
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
    flex: 1,
  },
  emptyStateCard: {
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: 'System',
    fontSize: 13,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    fontFamily: 'System',
    fontSize: 13,
    color: '#1E293B',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    height: 40,
    borderRadius: 12,
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
});
