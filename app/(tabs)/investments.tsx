import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Investment } from '@/lib/types';
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

const InvestmentCard = ({ item }: { item: Investment }) => {
  const totalValue = item.quantity * item.currentPrice;
  const gainLoss = (item.currentPrice - item.buyPrice) * item.quantity;
  const isGain = gainLoss >= 0;

  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle">{item.name}</ThemedText>
        <ThemedText style={styles.symbol}>{item.symbol}</ThemedText>
      </View>
      <View style={styles.cardBody}>
        <ThemedText>Value: {formatCurrency(totalValue)}</ThemedText>
        <ThemedText style={isGain ? styles.gain : styles.loss}>
          {isGain ? '+' : ''}{formatCurrency(gainLoss)}
        </ThemedText>
      </View>
    </ThemedView>
  );
};

export default function InvestmentsScreen() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        setLoading(true);
        // 1. Get current user ID from AsyncStorage (Matching web's custom auth)
        const userId = await AsyncStorage.getItem('user_session');
        
        if (!userId) {
          throw new Error('User not authenticated');
        }

        // 2. Fetch from the correct table 'ff_investments'
        const { data, error: dbError } = await supabase
          .from('ff_investments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (dbError) {
          throw new Error(dbError.message);
        }

        if (data) {
          // 3. Map database snake_case to our camelCase type
          const mappedData: Investment[] = data.map(inv => ({
            id: inv.id,
            name: inv.name,
            symbol: inv.symbol,
            type: inv.type,
            quantity: Number(inv.quantity),
            buyPrice: Number(inv.buy_price),
            currentPrice: Number(inv.current_price || 0),
            date: inv.date
          }));
          setInvestments(mappedData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvestments();
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 8 }}>Loading Investments...</ThemedText>
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
        data={investments}
        renderItem={({ item }) => <InvestmentCard item={item} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ThemedText type="title" style={styles.title}>
            Investments
          </ThemedText>
        }
        ListEmptyComponent={
          <ThemedView style={styles.centered}>
            <ThemedText>No investments found.</ThemedText>
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
    marginBottom: 12,
  },
  symbol: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gain: {
    color: '#2e7d32',
  },
  loss: {
    color: '#c62828',
  },
});
