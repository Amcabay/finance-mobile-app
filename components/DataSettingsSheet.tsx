import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '@/core/database/sqlite';
import { BillRepository } from '@/features/bills/repository/BillRepository';
import { requestNotificationPermissions, scheduleBillReminders } from '@/core/services/notificationService';

interface DataSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

export default function DataSettingsSheet({ isOpen, onClose, onDataChange }: DataSettingsSheetProps) {
  const [totalTxsCount, setTotalTxsCount] = useState(0);
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [reminderStrategy, setReminderStrategy] = useState<'H-1' | 'H-5' | 'H-10' | 'M-1'>('H-1');

  const loadStats = useCallback(async () => {
    try {
      const db = await getDatabase();
      const txCountRows = await db.getAllAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM transactions"
      );
      const txCount = txCountRows[0]?.count || 0;
      setTotalTxsCount(txCount);
    } catch (error) {
      console.error('Failed to load transaction stats:', error);
    }
  }, []);

  const loadReminderSettings = useCallback(async () => {
    try {
      const storedEnabled = await AsyncStorage.getItem('isReminderEnabled');
      const storedStrategy = await AsyncStorage.getItem('reminderStrategy');
      if (storedEnabled !== null) {
        setIsReminderEnabled(storedEnabled === 'true');
      }
      if (storedStrategy !== null) {
        setReminderStrategy(storedStrategy as any);
      }
    } catch (error) {
      console.error('Failed to load reminder settings:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      loadReminderSettings();
    }
  }, [isOpen, loadStats, loadReminderSettings]);

  const handleExportCSV = async () => {
    try {
      const db = await getDatabase();
      const txs = await db.getAllAsync<any>(
        "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC",
        ['offline-user']
      );

      if (txs.length === 0) {
        Alert.alert('No Records', 'There are no transactions in the local ledger to export.');
        return;
      }

      const headers = ['ID', 'User ID', 'Description', 'Amount', 'Category', 'Type', 'Date', 'Sync Status', 'Account ID'];
      let csvContent = headers.join(',') + '\n';

      txs.forEach((tx: any) => {
        const row = [
          tx.id !== null && tx.id !== undefined ? String(tx.id) : '',
          tx.user_id !== null && tx.user_id !== undefined ? String(tx.user_id) : '',
          `"${String(tx.description || '').replace(/"/g, '""')}"`,
          tx.amount !== null && tx.amount !== undefined ? String(tx.amount) : '0',
          `"${tx.category !== null && tx.category !== undefined ? String(tx.category).replace(/"/g, '""') : ''}"`,
          `"${tx.type !== null && tx.type !== undefined ? String(tx.type).replace(/"/g, '""') : ''}"`,
          `"${tx.date !== null && tx.date !== undefined ? String(tx.date).replace(/"/g, '""') : ''}"`,
          `"${tx.sync_status !== null && tx.sync_status !== undefined ? String(tx.sync_status).replace(/"/g, '""') : ''}"`,
          `"${tx.account_id !== null && tx.account_id !== undefined ? String(tx.account_id).replace(/"/g, '""') : ''}"`
        ];
        csvContent += row.join(',') + '\n';
      });

      const fs = FileSystem as any;
      const directory = fs.cacheDirectory || fs.documentDirectory;
      if (!directory) {
        throw new Error('Local file system directory is unavailable.');
      }
      const fileUri = `${directory}finance_flow_transactions.csv`;

      await fs.writeAsStringAsync(fileUri, csvContent, {
        encoding: fs.EncodingType.UTF8,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Transaction Ledger',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert('Sharing Unavailable', 'Native sharing is not supported on this platform.');
      }
    } catch (error) {
      console.error('Failed to export CSV:', error);
      Alert.alert('Export Failed', 'An error occurred during the CSV serialization or sharing process.');
    }
  };

  const handleRecalibrateLedger = async () => {
    try {
      const db = await getDatabase();
      const txCountRows = await db.getAllAsync<any>(
        "SELECT COUNT(*) as count FROM transactions"
      );
      const count = txCountRows[0]?.count || 0;

      await db.withTransactionAsync(async () => {
        if (count === 0) {
          await db.runAsync("UPDATE accounts SET balance = 0;");
        } else {
          await db.runAsync("UPDATE accounts SET balance = 0;");
          const transactions = await db.getAllAsync<any>("SELECT account_id, amount, type FROM transactions;");
          for (const tx of transactions) {
            const accId = tx.account_id || 'acc-cash';
            const amount = tx.amount || 0;
            if (tx.type === 'income') {
              await db.runAsync("UPDATE accounts SET balance = balance + ? WHERE id = ?;", [amount, accId]);
            } else if (tx.type === 'expense') {
              await db.runAsync("UPDATE accounts SET balance = balance - ? WHERE id = ?;", [amount, accId]);
            }
          }
        }
      });

      Alert.alert('Verification Complete', 'All localized account ledgers have been verified and recalibrated successfully.');
      if (onDataChange) {
        onDataChange();
      }
      loadStats();
    } catch (error) {
      console.error('Recalibration failed:', error);
      Alert.alert('Error', 'A database exception occurred during the recalibration process.');
    }
  };

  const handleFactoryReset = () => {
    Alert.alert(
      'Factory Reset',
      'Are you sure you want to permanently delete all transactions, accounts, and bills? This action is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.withTransactionAsync(async () => {
                await db.runAsync("DELETE FROM transactions;");
                await db.runAsync("DELETE FROM bills;");
                await db.runAsync("DELETE FROM budgets;");
                await db.runAsync("DELETE FROM accounts;");
                await db.runAsync("DELETE FROM notes;").catch(() => {});
                await db.runAsync("DELETE FROM schedules;").catch(() => {});
                await db.runAsync("INSERT INTO accounts (id, name, type, balance) VALUES ('acc-cash', 'Cash', 'Cash', 0);");
                await db.runAsync("INSERT INTO accounts (id, name, type, balance) VALUES ('acc-bank', 'Bank', 'Bank', 0);");
              });
              Alert.alert('Success', 'Local database instances have been safely cleared and initialized.');
              if (onDataChange) {
                onDataChange();
              }
              loadStats();
              // Clear scheduled reminders
              await scheduleBillReminders([], 'H-1');
            } catch (error) {
              console.error('Factory reset failed:', error);
              Alert.alert('Error', 'Failed to execute factory reset database purge.');
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  const syncReminders = async (enabled: boolean, strategy: 'H-1' | 'H-5' | 'H-10' | 'M-1') => {
    try {
      if (enabled) {
        const billRepository = new BillRepository();
        const dbBills = await billRepository.getBills('offline-user');
        await scheduleBillReminders(dbBills || [], strategy);
      } else {
        await scheduleBillReminders([], strategy);
      }
    } catch (e) {
      console.error('Failed to sync reminders in sheet:', e);
    }
  };

  const handleToggleReminder = async (value: boolean) => {
    try {
      setIsReminderEnabled(value);
      await AsyncStorage.setItem('isReminderEnabled', String(value));

      if (value) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert('Permission Denied', 'Notification permissions are required to enable bill reminders.');
          setIsReminderEnabled(false);
          await AsyncStorage.setItem('isReminderEnabled', 'false');
          return;
        }
        await syncReminders(true, reminderStrategy);
      } else {
        await syncReminders(false, reminderStrategy);
      }
    } catch (error) {
      console.error('Failed to save reminder toggle:', error);
    }
  };

  const handleSelectStrategy = async (strategy: 'H-1' | 'H-5' | 'H-10' | 'M-1') => {
    try {
      setReminderStrategy(strategy);
      await AsyncStorage.setItem('reminderStrategy', strategy);

      if (isReminderEnabled) {
        await syncReminders(true, strategy);
      }
    } catch (error) {
      console.error('Failed to save reminder strategy:', error);
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.settingsModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Data & Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeModalButton} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#333D53" />
            </TouchableOpacity>
          </View>

          <View style={styles.settingsList}>
            <TouchableOpacity
              style={styles.settingsRow}
              activeOpacity={0.7}
              onPress={async () => {
                await handleExportCSV();
                onClose();
              }}
            >
              <View style={styles.settingsRowLeft}>
                <Ionicons name="download-outline" size={20} color="#475569" />
                <Text style={styles.settingsRowText}>Export to CSV</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.settingsRow}
              activeOpacity={0.7}
              onPress={async () => {
                await handleRecalibrateLedger();
                onClose();
              }}
            >
              <View style={styles.settingsRowLeft}>
                <Ionicons name="sync-outline" size={20} color="#475569" />
                <Text style={styles.settingsRowText}>Recalibrate Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity
              style={styles.settingsRow}
              activeOpacity={0.7}
              onPress={() => {
                handleFactoryReset();
                onClose();
              }}
            >
              <View style={styles.settingsRowLeft}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={[styles.settingsRowText, styles.dangerText]}>Factory Reset</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <View style={styles.settingsSwitchRow}>
              <View style={styles.settingsRowLeft}>
                <Ionicons name="notifications-outline" size={20} color="#475569" />
                <Text style={styles.settingsRowText}>Upcoming Bill Reminders</Text>
              </View>
              <Switch
                value={isReminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: '#CBD5E1', true: '#3A86FF' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
              />
            </View>

            {isReminderEnabled && (
              <View style={styles.strategyContainer}>
                <Text style={styles.strategyLabel}>Reminder Schedule Interval</Text>
                <View style={styles.strategyChipsRow}>
                  {([
                    { id: 'H-1', label: 'H-1' },
                    { id: 'H-5', label: 'H-5' },
                    { id: 'H-10', label: 'H-10' },
                    { id: 'M-1', label: '1st of Month' }
                  ] as const).map(option => {
                    const isSelected = reminderStrategy === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.strategyChip,
                          isSelected ? styles.strategyChipActive : styles.strategyChipInactive
                        ]}
                        onPress={() => handleSelectStrategy(option.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.strategyChipText,
                          isSelected ? styles.strategyChipTextActive : styles.strategyChipTextInactive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          <Text style={styles.dbStatsText}>
            Storage: Local SQLite | Total Logs: {totalTxsCount} Records
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  settingsModalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
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
  settingsList: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsRowText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  dangerText: {
    color: '#EF4444',
  },
  dbStatsText: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
  },
  settingsSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  strategyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FAFBFD',
  },
  strategyLabel: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  strategyChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  strategyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strategyChipActive: {
    backgroundColor: '#3A86FF',
    borderColor: '#3A86FF',
  },
  strategyChipInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  strategyChipText: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '600',
  },
  strategyChipTextActive: {
    color: '#FFFFFF',
  },
  strategyChipTextInactive: {
    color: '#64748B',
  },
});
