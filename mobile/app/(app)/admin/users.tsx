import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView, Alert } from 'react-native';
import {
  Text, Surface, FAB, Portal, Modal, TextInput, Button,
  HelperText, ActivityIndicator, IconButton, Switch, Chip,
} from 'react-native-paper';
import AdminService from '../../../services/adminService';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { router } from 'expo-router';

export default function UserManagementScreen() {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // Admin guard
  if (user?.role !== 'ADMIN') {
    router.replace('/(app)');
    return null;
  }

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'USER', enabled: true });
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await AdminService.listUsers();
      setUsers(data);
    } catch {
      showNotification('Failed to load users', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ username: '', password: '', role: 'USER', enabled: true });
    setFormError('');
    setModalVisible(true);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setForm({ username: u.username, password: '', role: u.role, enabled: u.enabled });
    setFormError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!editing && (!form.username.trim() || !form.password)) {
      setFormError('Username and password are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await AdminService.updateUser(editing.id, { role: form.role, enabled: form.enabled });
        showNotification('User updated', 'success');
      } else {
        await AdminService.createUser({ username: form.username.trim(), password: form.password, role: form.role });
        showNotification('User created', 'success');
      }
      setModalVisible(false);
      load();
    } catch (e: any) {
      setFormError(e?.friendlyMessage || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 10) {
      setFormError('Password must be at least 10 characters.');
      return;
    }
    setSaving(true);
    try {
      await AdminService.resetPassword(resetUserId!, { newPassword });
      showNotification('Password reset successful', 'success');
      setResetModalVisible(false);
      setNewPassword('');
    } catch (e: any) {
      setFormError(e?.friendlyMessage || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (u: any) => {
    Alert.alert('Delete User', `Delete user "${u.username}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await AdminService.deleteUser(u.id);
          showNotification('User deleted', 'success');
          load();
        } catch {
          showNotification('Failed to delete user', 'error');
        }
      }},
    ]);
  };

  const renderItem = ({ item }: any) => (
    <Surface style={styles.item} elevation={1}>
      <View style={styles.itemLeft}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: item.role === 'ADMIN' ? '#f59e0b' : '#6366f1' }]}>
            <Text style={styles.avatarText}>{item.username?.[0]?.toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.itemName}>{item.username}</Text>
            <Chip compact style={styles.chip} textStyle={{ fontSize: 10, color: item.role === 'ADMIN' ? '#f59e0b' : '#94a3b8' }}>
              {item.role}
            </Chip>
          </View>
        </View>
        <Text style={[styles.status, { color: item.enabled ? '#10b981' : '#ef4444' }]}>
          {item.enabled ? 'Active' : 'Disabled'}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <IconButton icon="pencil" size={18} iconColor="#6366f1" onPress={() => openEdit(item)} />
        <IconButton icon="lock-reset" size={18} iconColor="#f59e0b" onPress={() => {
          setResetUserId(item.id); setFormError(''); setNewPassword(''); setResetModalVisible(true);
        }} />
        {item.id !== user?.userId && (
          <IconButton icon="delete" size={18} iconColor="#ef4444" onPress={() => handleDelete(item)} />
        )}
      </View>
    </Surface>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6366f1" />}
          ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
        />
      )}

      <FAB icon="account-plus" style={styles.fab} onPress={openAdd} color="#fff" />

      {/* Add/Edit Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editing ? `Edit User: ${editing.username}` : 'Create User'}
          </Text>
          {!editing && (
            <TextInput label="Username" value={form.username} onChangeText={(v) => setForm({ ...form, username: v })}
              mode="outlined" style={styles.input} theme={{ colors: { background: '#0f172a' } }} autoCapitalize="none" />
          )}
          {!editing && (
            <TextInput label="Password (min 10 chars)" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })}
              secureTextEntry mode="outlined" style={styles.input} theme={{ colors: { background: '#0f172a' } }} />
          )}
          <Text style={styles.label}>Role</Text>
          <View style={styles.chips}>
            {['USER', 'ADMIN'].map((r) => (
              <Chip key={r} selected={form.role === r} onPress={() => setForm({ ...form, role: r })}
                style={[styles.optChip, form.role === r && styles.optChipSelected]}
                textStyle={{ color: form.role === r ? '#fff' : '#94a3b8' }}>
                {r}
              </Chip>
            ))}
          </View>
          {editing && (
            <View style={styles.switchRow}>
              <Text style={{ color: '#f8fafc' }}>Account Enabled</Text>
              <Switch value={form.enabled} onValueChange={(v) => setForm({ ...form, enabled: v })} color="#6366f1" />
            </View>
          )}
          {formError ? <HelperText type="error" visible>{formError}</HelperText> : null}
          <View style={styles.modalButtons}>
            <Button onPress={() => setModalVisible(false)} textColor="#94a3b8">Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={saving} style={styles.saveBtn}>Save</Button>
          </View>
        </Modal>

        {/* Reset Password Modal */}
        <Modal visible={resetModalVisible} onDismiss={() => setResetModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>Reset Password</Text>
          <TextInput label="New Password (min 10 chars)" value={newPassword} onChangeText={setNewPassword}
            secureTextEntry mode="outlined" style={styles.input} theme={{ colors: { background: '#0f172a' } }} />
          {formError ? <HelperText type="error" visible>{formError}</HelperText> : null}
          <View style={styles.modalButtons}>
            <Button onPress={() => setResetModalVisible(false)} textColor="#94a3b8">Cancel</Button>
            <Button mode="contained" onPress={handleResetPassword} loading={saving} style={styles.saveBtn}>Reset</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  list: { padding: 12, paddingBottom: 80 },
  item: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  itemLeft: { flex: 1 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  itemName: { color: '#f8fafc', fontWeight: '600' },
  chip: { alignSelf: 'flex-start', backgroundColor: '#334155', height: 22, marginTop: 4 },
  status: { fontSize: 12, marginTop: 4 },
  itemActions: { flexDirection: 'row' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#6366f1' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  modal: { backgroundColor: '#1e293b', margin: 16, borderRadius: 16, padding: 20 },
  modalTitle: { color: '#f8fafc', fontWeight: '700', marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: '#0f172a' },
  label: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  optChip: { backgroundColor: '#334155' },
  optChipSelected: { backgroundColor: '#6366f1' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  saveBtn: { backgroundColor: '#6366f1' },
});
