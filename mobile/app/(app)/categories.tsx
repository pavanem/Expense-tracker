import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native';
import {
  Text, Surface, FAB, Portal, Modal, TextInput, Button,
  Chip, HelperText, ActivityIndicator, IconButton, Switch,
} from 'react-native-paper';
import CategoryService from '../../services/categoryService';
import { useNotification } from '../../context/NotificationContext';
import SyncStatusBanner from '../../components/SyncStatusBanner';
import syncService from '../../services/offline/syncService';
import OfflineStorage, { STORAGE_KEYS } from '../../services/offline/offlineStorage';

export default function CategoriesScreen() {
  const { showNotification } = useNotification();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      syncService.syncQueue().catch(() => {});
    }
    try {
      const data = await CategoryService.list();
      setCategories(data);
    } catch {
      showNotification('Failed to load categories', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Instantly load cached categories (< 5ms)
    OfflineStorage.get<any[]>(STORAGE_KEYS.CATEGORIES).then((cached) => {
      if (cached && cached.length > 0) {
        setCategories(cached);
        setLoading(false);
      }
    });
    load();
  }, []);

  const openAdd = () => { setEditing(null); setName(''); setFormError(''); setModalVisible(true); };
  const openEdit = (cat: any) => { setEditing(cat); setName(cat.name); setFormError(''); setModalVisible(true); };

  const handleSave = async () => {
    if (!name.trim()) { setFormError('Category name is required.'); return; }
    setSaving(true);
    try {
      if (editing) {
        await CategoryService.update(editing.id, { name: name.trim(), status: editing.status });
        showNotification('Category updated', 'success');
      } else {
        await CategoryService.create({ name: name.trim() });
        showNotification('Category created', 'success');
      }
      setModalVisible(false);
      load();
    } catch (e: any) {
      setFormError(e?.friendlyMessage || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (cat: any) => {
    try {
      const newStatus = cat.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
      await CategoryService.update(cat.id, { name: cat.name, status: newStatus });
      showNotification(`Category ${newStatus === 'ACTIVE' ? 'activated' : 'archived'}`, 'success');
      load();
    } catch {
      showNotification('Failed to update status', 'error');
    }
  };

  const renderItem = ({ item }: any) => (
    <Surface style={styles.item} elevation={1}>
      <View style={styles.itemLeft}>
        <Text style={[styles.itemName, item.status === 'ARCHIVED' && styles.archived]}>{item.name}</Text>
        <Chip compact style={[styles.chip, item.status === 'ARCHIVED' && styles.archivedChip]}
          textStyle={{ fontSize: 10, color: item.status === 'ARCHIVED' ? '#64748b' : '#10b981' }}>
          {item.status}
        </Chip>
      </View>
      <View style={styles.itemActions}>
        <IconButton icon="pencil" size={18} iconColor="#6366f1" onPress={() => openEdit(item)} />
        <Switch value={item.status === 'ACTIVE'} onValueChange={() => toggleStatus(item)} color="#6366f1" />
      </View>
    </Surface>
  );

  return (
    <View style={styles.container}>
      <SyncStatusBanner />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6366f1" />}
          ListEmptyComponent={<Text style={styles.empty}>No categories yet</Text>}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={openAdd} color="#fff" />

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editing ? 'Edit Category' : 'Add Category'}
          </Text>
          <TextInput label="Category Name" value={name} onChangeText={setName}
            mode="outlined" style={styles.input} theme={{ colors: { background: '#0f172a' } }}
            autoFocus onSubmitEditing={handleSave} />
          {formError ? <HelperText type="error" visible>{formError}</HelperText> : null}
          <View style={styles.modalButtons}>
            <Button onPress={() => setModalVisible(false)} textColor="#94a3b8">Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={saving} style={styles.saveBtn}>Save</Button>
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
  itemName: { color: '#f8fafc', fontWeight: '600', marginBottom: 4 },
  archived: { color: '#475569' },
  chip: { alignSelf: 'flex-start', backgroundColor: '#0f172a', height: 22 },
  archivedChip: { backgroundColor: '#1e293b' },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#6366f1' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  modal: { backgroundColor: '#1e293b', margin: 24, borderRadius: 16, padding: 20 },
  modalTitle: { color: '#f8fafc', fontWeight: '700', marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: '#0f172a' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  saveBtn: { backgroundColor: '#6366f1' },
});
