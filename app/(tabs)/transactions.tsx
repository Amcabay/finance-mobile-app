import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Transaction } from '@/lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const TransactionCard = ({ item }: { item: Transaction }) => {
  const isIncome = item.type === 'income';
  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle">{item.description}</ThemedText>
        <ThemedText style={isIncome ? styles.income : styles.expense}>
          {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
        </ThemedText>
      </View>
      <View style={styles.cardBody}>
        <ThemedText style={styles.category}>{item.category}</ThemedText>
        <ThemedText style={styles.date}>{new Date(item.date).toLocaleDateString('id-ID')}</ThemedText>
      </View>
    </ThemedView>
  );
};

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        // 1. Get current user ID from AsyncStorage (Matching web's custom auth)
        const userId = await AsyncStorage.getItem('user_session');

        if (!userId) {
          throw new Error('User not authenticated');
        }

        // 2. Fetch from the correct table 'ff_transactions'
        const { data, error: dbError } = await supabase
          .from('ff_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (dbError) {
          throw new Error(dbError.message);
        }
        if (data) {
          setTransactions(data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 8 }}>Loading Transactions...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">Error fetching data</ThemedText>
        <ThemedText>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={({ item }) => <TransactionCard item={item} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ThemedText type="title" style={styles.title}>
            Transactions
          </ThemedText>
        }
        ListEmptyComponent={
          <ThemedView style={styles.centered}>
            <ThemedText>No transactions found.</ThemedText>
          </ThemedView>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    opacity: 0.8,
    fontSize: 14,
  },
  date: {
    opacity: 0.8,
    fontSize: 14,
  },
  income: {
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  expense: {
    color: '#c62828',
    fontWeight: 'bold',
  },
});
