import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Safely requests and audits user permissions for local device alerts.
 * Returns true if permissions are granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    
    if (status === 'granted' && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Dynamic monthly notification scheduler for active bills.
 * Computes reminder dates based on the configured strategy.
 */
export async function scheduleBillReminders(
  billsArray: any[],
  strategy: 'H-1' | 'H-5' | 'H-10' | 'M-1'
): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    // Clear all previously scheduled notifications to maintain state sanity.
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Iterate only active bills.
    const activeBills = (billsArray || []).filter(bill => bill.active);

    let interval = 0;
    if (strategy === 'H-1') {
      interval = 1;
    } else if (strategy === 'H-5') {
      interval = 5;
    } else if (strategy === 'H-10') {
      interval = 10;
    }

    for (const bill of activeBills) {
      let targetDay = 1;

      if (strategy === 'M-1') {
        // M-1 strategy locks delivery to exactly the 1st calendar day of the month.
        targetDay = 1;
      } else {
        const billingDayVal = Number(bill.billing_day);
        if (isNaN(billingDayVal)) {
          continue;
        }
        // Subtract target interval from bill billing day.
        targetDay = billingDayVal - interval;
        // Boundary check: wrap around if day falls below or equals 0.
        if (targetDay <= 0) {
          targetDay = 30 + targetDay;
        }
      }

      // Convert bill amount to integer.
      const amountVal = Number(bill.amount);
      const formattedAmount = isNaN(amountVal)
        ? 'IDR 0'
        : 'Rp ' + amountVal.toLocaleString('id-ID');

      // Calculate time-interval in seconds to reach the target date at 09:00 AM
      const now = new Date();
      let targetDate = new Date(now.getFullYear(), now.getMonth(), targetDay, 9, 0, 0, 0);
      if (targetDate.getTime() <= now.getTime()) {
        targetDate = new Date(now.getFullYear(), now.getMonth() + 1, targetDay, 9, 0, 0, 0);
      }
      const calculatedSeconds = Math.max(1, Math.floor((targetDate.getTime() - now.getTime()) / 1000));

      // Enqueue notification using a strictly supported cross-platform seconds interval trigger.
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Bill Reminder',
          body: `Your bill "${bill.name}" of ${formattedAmount} is due soon.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: calculatedSeconds,
          repeats: false,
        },
      });
    }
  } catch (error) {
    console.error('Failed to schedule bill reminders:', error);
  }
}

/**
 * Calculates and schedules a 15-minute prior notification alert for agenda events.
 */
export async function scheduleCalendarEventReminder(eventObject: any): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    let triggerTime: Date;

    if (eventObject.trigger_timestamp) {
      triggerTime = new Date(Number(eventObject.trigger_timestamp));
    } else {
      const eventDateStr = eventObject.due_date || eventObject.date;
      if (!eventDateStr) {
        return;
      }
      const [year, month, day] = eventDateStr.split('-').map(Number);
      // Target event start execution time at 09:00 AM.
      const eventTime = new Date(year, month - 1, day, 9, 0, 0, 0);
      // Notification target is 15 minutes prior to the start time (08:45 AM).
      triggerTime = new Date(eventTime.getTime() - 15 * 60 * 1000);
    }

    const now = new Date();
    const calculatedSeconds = Math.floor((triggerTime.getTime() - now.getTime()) / 1000);

    if (calculatedSeconds > 0) {
      const reminderText = eventObject.reminder_text || '15 minutes';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Agenda',
          body: `Upcoming Agenda: ${eventObject.note} starts in ${reminderText}.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: calculatedSeconds,
          repeats: false,
        },
      });
    }
  } catch (error) {
    console.error('Failed to schedule calendar event reminder:', error);
  }
}
