import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text, Surface, Button, TextInput, HelperText, Divider, List,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import AuthService from '../../services/authService';
import { getApiUrl, setApiUrl } from '../../services/tokenStore';
import { updateApiUrl } from '../../services/apiClient';
import syncService from '../../services/offline/syncService';
import { useEffect } from 'react';

export default function SettingsScreen() {
  const { user, logout, logoutAllDevices } = useAuth();
  const { showNotification } = useNotification();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  const [serverUrl, setServerUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);

  useEffect(() => {
    getApiUrl().then(setServerUrl);
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 10) {
      setPwError('Password must be at least 10 characters.');
      return;
    }
    setPwError('');
    setChangingPw(true);
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      showNotification('Password changed. Please log in again.', 'success');
      setShowPwForm(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) {
      setPwError(e?.friendlyMessage || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  const handleSaveUrl = async () => {
    let raw = serverUrl.trim();
    if (!raw) return;
    setSavingUrl(true);
    try {
      // 1. Prepend http:// if user omitted http:// or https://
      if (!/^https?:\/\//i.test(raw)) {
        raw = 'http://' + raw;
      }
      // 2. Strip any trailing slashes
      raw = raw.replace(/\/+$/, '');
      // 3. Ensure path ends with /api (without duplicating)
      if (!raw.endsWith('/api')) {
        raw = raw + '/api';
      }
      setServerUrl(raw);
      await setApiUrl(raw);
      await updateApiUrl(raw);

      // Trigger reachability check and queue sync immediately
      syncService.checkReachability().then((reachable) => {
        if (reachable) {
          syncService.syncQueue().catch(() => {});
        }
      });

      showNotification(`Server URL set to ${raw}`, 'success');
    } catch {
      showNotification('Failed to update URL', 'error');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Log out from this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout().then(() => router.replace('/(auth)/login')) },
    ]);
  };

  const handleLogoutAll = () => {
    Alert.alert('Log Out Everywhere', 'This will log you out from all devices.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out All', style: 'destructive', onPress: () => logoutAllDevices().then(() => router.replace('/(auth)/login')) },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile */}
      <Surface style={styles.card} elevation={2}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.role}>{user?.role}</Text>
          </View>
        </View>
      </Surface>

      {/* Server URL */}
      <Surface style={styles.card} elevation={2}>
        <Text variant="titleSmall" style={styles.sectionTitle}>Server Connection</Text>
        <TextInput
          label="Tailscale API URL"
          value={serverUrl}
          onChangeText={setServerUrl}
          mode="outlined"
          style={styles.input}
          theme={{ colors: { background: '#0f172a' } }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://100.x.x.x/api"
        />
        <Button mode="outlined" onPress={handleSaveUrl} loading={savingUrl} style={styles.outlineBtn} textColor="#6366f1">
          Save Server URL
        </Button>
      </Surface>

      {/* Navigation shortcuts */}
      <Surface style={styles.card} elevation={2}>
        <Text variant="titleSmall" style={styles.sectionTitle}>Manage</Text>
        <List.Item title="Expense Categories" titleStyle={styles.listTitle}
          left={(p) => <List.Icon {...p} icon="tag" color="#6366f1" />}
          right={(p) => <List.Icon {...p} icon="chevron-right" color="#475569" />}
          onPress={() => router.push('/(app)/categories')} />
        <Divider style={styles.divider} />
        <List.Item title="Income Categories" titleStyle={styles.listTitle}
          left={(p) => <List.Icon {...p} icon="tag-outline" color="#10b981" />}
          right={(p) => <List.Icon {...p} icon="chevron-right" color="#475569" />}
          onPress={() => router.push('/(app)/income-categories')} />
        {user?.role === 'ADMIN' && (
          <>
            <Divider style={styles.divider} />
            <List.Item title="User Management" titleStyle={styles.listTitle}
              left={(p) => <List.Icon {...p} icon="account-group" color="#f59e0b" />}
              right={(p) => <List.Icon {...p} icon="chevron-right" color="#475569" />}
              onPress={() => router.push('/(app)/admin/users')} />
          </>
        )}
      </Surface>

      {/* Change Password */}
      <Surface style={styles.card} elevation={2}>
        <List.Item
          title="Change Password"
          titleStyle={styles.listTitle}
          left={(p) => <List.Icon {...p} icon="lock-reset" color="#6366f1" />}
          right={(p) => <List.Icon {...p} icon={showPwForm ? 'chevron-up' : 'chevron-down'} color="#475569" />}
          onPress={() => { setShowPwForm(!showPwForm); setPwError(''); }}
        />
        {showPwForm && (
          <View style={styles.pwForm}>
            <TextInput label="Current Password" value={currentPassword} onChangeText={setCurrentPassword}
              secureTextEntry mode="outlined" style={styles.input} theme={{ colors: { background: '#0f172a' } }} />
            <TextInput label="New Password (min 10 chars)" value={newPassword} onChangeText={setNewPassword}
              secureTextEntry mode="outlined" style={styles.input} theme={{ colors: { background: '#0f172a' } }} />
            <TextInput label="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword}
              secureTextEntry mode="outlined" style={styles.input} theme={{ colors: { background: '#0f172a' } }} />
            {pwError ? <HelperText type="error" visible>{pwError}</HelperText> : null}
            <Button mode="contained" onPress={handleChangePassword} loading={changingPw} style={styles.saveBtn}>
              Update Password
            </Button>
          </View>
        )}
      </Surface>

      {/* Logout */}
      <Surface style={styles.card} elevation={2}>
        <Button mode="outlined" onPress={handleLogout} style={styles.logoutBtn} textColor="#ef4444"
          icon="logout">
          Log Out This Device
        </Button>
        <Button mode="text" onPress={handleLogoutAll} style={{ marginTop: 8 }} textColor="#94a3b8"
          icon="logout-variant">
          Log Out All Devices
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  username: { color: '#f8fafc', fontWeight: '700', fontSize: 18 },
  role: { color: '#6366f1', fontSize: 13, marginTop: 2 },
  sectionTitle: { color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  input: { marginBottom: 12, backgroundColor: '#0f172a' },
  outlineBtn: { borderColor: '#6366f1' },
  listTitle: { color: '#f8fafc' },
  divider: { backgroundColor: '#334155', marginVertical: 2 },
  pwForm: { marginTop: 8 },
  saveBtn: { backgroundColor: '#6366f1', marginTop: 4 },
  logoutBtn: { borderColor: '#ef4444' },
});
