import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import syncService from '../services/offline/syncService';
import { useNotification } from '../context/NotificationContext';

export default function SyncStatusBanner() {
  const { showNotification } = useNotification();
  const [state, setState] = useState(syncService.getState());

  useEffect(() => {
    const unsubscribe = syncService.subscribe((newState) => {
      setState(newState);
    });
    syncService.startAutoSync();
    return () => {
      unsubscribe();
      syncService.stopAutoSync();
    };
  }, []);

  const handleSyncPress = async () => {
    const res = await syncService.syncQueue();
    if (!res.isOnline) {
      showNotification('Still offline — Tailscale not reachable', 'error');
    } else if (res.synced > 0) {
      showNotification(`Synced ${res.synced} offline transaction${res.synced > 1 ? 's' : ''}!`, 'success');
    } else if (res.pending === 0) {
      showNotification('Everything is up to date', 'info');
    }
  };

  // If online and nothing is pending or syncing, render nothing
  if (state.isOnline && state.pendingCount === 0 && !state.isSyncing) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        state.isSyncing
          ? styles.syncing
          : !state.isOnline
          ? styles.offline
          : styles.pending,
      ]}
    >
      <View style={styles.content}>
        {state.isSyncing ? (
          <ActivityIndicator size={16} color="#ffffff" style={styles.icon} />
        ) : (
          <MaterialCommunityIcons
            name={!state.isOnline ? 'cloud-off-outline' : 'cloud-sync-outline'}
            size={18}
            color="#ffffff"
            style={styles.icon}
          />
        )}
        <Text style={styles.text}>
          {state.isSyncing
            ? 'Syncing offline changes...'
            : !state.isOnline
            ? `Offline (Cached Data)${
                state.pendingCount > 0 ? ` • ${state.pendingCount} pending` : ''
              }`
            : `${state.pendingCount} change${
                state.pendingCount > 1 ? 's' : ''
              } waiting to sync`}
        </Text>
      </View>

      {!state.isSyncing && (
        <TouchableOpacity
          style={styles.button}
          onPress={handleSyncPress}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>
            {!state.isOnline ? 'Retry' : 'Sync Now'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offline: {
    backgroundColor: '#b45309', // Amber-700
  },
  pending: {
    backgroundColor: '#1d4ed8', // Blue-700
  },
  syncing: {
    backgroundColor: '#4f46e5', // Indigo-600
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
