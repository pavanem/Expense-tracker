import { useCallback, useEffect, useState } from 'react';
import {
  FlatList, StyleSheet, View, RefreshControl, TouchableOpacity, ScrollView,
} from 'react-native';
import {
  Text, FAB, Portal, Modal, TextInput, Button, Surface,
  HelperText, ActivityIndicator, IconButton,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import IncomeService from '../../services/incomeService';
import IncomeCategoryService from '../../services/incomeCategoryService';
import { useNotification } from '../../context/NotificationContext';
import DropdownSelect from '../../components/DropdownSelect';

const PAGE_SIZE = 20;

export default function IncomeScreen() {
  const { showNotification } = useNotification();
  const [incomes, setIncomes] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    amount: '',
    categoryId: '',
    date: new Date(),
    source: '',
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    try {
      const data = await IncomeCategoryService.list();
      setCategories(data);
    } catch {}
  };

  const loadIncomes = useCallback(async (pageNum = 0, isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); setPage(0); }
    try {
      const data = searchQuery.trim()
        ? await IncomeService.search(searchQuery, { page: pageNum, size: PAGE_SIZE, sort: 'date,desc' })
        : await IncomeService.list({ page: pageNum, size: PAGE_SIZE, sort: 'date,desc' });
      const items = data.content ?? data;
      if (isRefresh || pageNum === 0) setIncomes(items);
      else setIncomes((prev) => [...prev, ...items]);
      setHasMore(!data.last);
    } catch {
      showNotification('Failed to load income', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => { loadCategories(); loadIncomes(0); }, []);
  useEffect(() => { loadIncomes(0); }, [searchQuery]);

  const openAdd = () => {
    setEditingIncome(null);
    setForm({
      amount: '',
      categoryId: '',
      date: new Date(),
      source: '',
      description: '',
    });
    setFormError('');
    setModalVisible(true);
  };

  const openEdit = (income: any) => {
    setEditingIncome(income);
    const dateStr = income.incomeDate ?? income.date;
    const parsedDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    setForm({
      amount: String(Number(income.amount)),
      categoryId: String(income.incomeCategory?.id ?? income.categoryId ?? ''),
      date: parsedDate,
      source: income.source ?? '',
      description: income.description ?? '',
    });
    setFormError('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(form.amount);
    if (!form.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        amount: parsedAmount,
        incomeCategoryId: form.categoryId ? parseInt(form.categoryId) : null,
        incomeDate: format(form.date, 'yyyy-MM-dd'),
        source: form.source.trim() || null,
        description: form.description.trim() || null,
      };
      if (editingIncome) {
        await IncomeService.update(editingIncome.id, payload);
        showNotification('Income updated', 'success');
      } else {
        await IncomeService.create(payload);
        showNotification('Income added', 'success');
      }
      setModalVisible(false);
      loadIncomes(0, true);
    } catch (e: any) {
      setFormError(e?.friendlyMessage || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await IncomeService.remove(id);
      showNotification('Income deleted', 'success');
      loadIncomes(0, true);
    } catch {
      showNotification('Failed to delete', 'error');
    }
  };

  const categoryOptions = categories
    .filter((c) => c.status !== 'ARCHIVED')
    .map((c) => ({ value: String(c.id), label: c.name }));

  const renderItem = ({ item }: any) => {
    const dateFormatted = item.incomeDate
      ? format(new Date(item.incomeDate + 'T00:00:00'), 'dd MMM yyyy')
      : (item.date ? format(new Date(item.date), 'dd MMM yyyy') : '');

    return (
      <Surface style={styles.item} elevation={1}>
        <View style={styles.itemHeader}>
          <View style={styles.badgesRow}>
            {item.incomeCategory?.name ? (
              <View style={[styles.catBadge, { backgroundColor: item.incomeCategory.color ? `${item.incomeCategory.color}25` : '#334155' }]}>
                <View style={[styles.catDot, { backgroundColor: item.incomeCategory.color || '#10b981' }]} />
                <Text style={[styles.catText, { color: item.incomeCategory.color || '#cbd5e1' }]}>
                  {item.incomeCategory.name}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.itemAmount}>+₹{Number(item.amount ?? 0).toFixed(2)}</Text>
        </View>

        {/* Date */}
        <Text style={styles.itemDate}>{dateFormatted}</Text>

        {/* Payer / Source (Prominently displayed, exactly like web app) */}
        {item.source ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payer / Source: </Text>
            <Text style={styles.sourceText}>{item.source}</Text>
          </View>
        ) : null}

        {/* Description / Notes (if present) */}
        {item.description ? (
          <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Actions row */}
        <View style={styles.actionsRow}>
          <IconButton icon="pencil" size={18} iconColor="#6366f1" onPress={() => openEdit(item)} style={styles.actionBtn} />
          <IconButton icon="delete" size={18} iconColor="#ef4444" onPress={() => handleDelete(item.id)} style={styles.actionBtn} />
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search income…"
        value={searchQuery}
        onChangeText={setSearchQuery}
        mode="outlined"
        style={styles.search}
        left={<TextInput.Icon icon="magnify" />}
        right={searchQuery ? <TextInput.Icon icon="close" onPress={() => setSearchQuery('')} /> : null}
        theme={{ colors: { background: '#1e293b' } }}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
      ) : (
        <FlatList
          data={incomes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadIncomes(0, true)} tintColor="#6366f1" />}
          onEndReached={() => { if (hasMore) { const next = page + 1; setPage(next); loadIncomes(next); } }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<Text style={styles.empty}>No income records found</Text>}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={openAdd} color="#fff" />

      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text variant="titleLarge" style={styles.modalTitle}>
              {editingIncome ? 'Edit Income' : 'Add Income'}
            </Text>

            <TextInput
              label="Amount (₹) *"
              value={form.amount}
              onChangeText={(v) => setForm({ ...form, amount: v })}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Affix text="₹" />}
              theme={{ colors: { background: '#0f172a' } }}
              autoFocus
            />

            <DropdownSelect
              label="Category (optional)"
              value={form.categoryId}
              options={categoryOptions}
              onSelect={(val) => setForm({ ...form, categoryId: val })}
              placeholder="Select Income Category"
              allowClear
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <TextInput
                label="Income Date"
                value={format(form.date, 'dd MMM yyyy')}
                mode="outlined"
                editable={false}
                style={styles.input}
                left={<TextInput.Icon icon="calendar" />}
                theme={{ colors: { background: '#0f172a' } }}
              />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={form.date}
                mode="date"
                maximumDate={new Date()}
                onChange={(_, d) => { setShowDatePicker(false); if (d) setForm({ ...form, date: d }); }}
              />
            )}

            <TextInput
              label="Payer / Source (optional)"
              value={form.source}
              onChangeText={(v) => setForm({ ...form, source: v })}
              mode="outlined"
              style={styles.input}
              placeholder="e.g. Company name, Client, Dividend"
              theme={{ colors: { background: '#0f172a' } }}
            />

            <TextInput
              label="Description / notes (optional)"
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
              multiline
              numberOfLines={2}
              mode="outlined"
              style={styles.input}
              theme={{ colors: { background: '#0f172a' } }}
            />

            {formError ? <HelperText type="error" visible>{formError}</HelperText> : null}

            <View style={styles.modalButtons}>
              <Button onPress={() => setModalVisible(false)} textColor="#94a3b8">Cancel</Button>
              <Button mode="contained" onPress={handleSave} loading={saving} style={styles.saveBtn}>Save</Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  search: { margin: 12, backgroundColor: '#1e293b' },
  list: { padding: 12, paddingBottom: 80 },

  item: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  catText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemAmount: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  itemDate: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  sourceText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  descText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: -4,
  },
  actionBtn: {
    margin: 0,
  },

  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#10b981' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  modal: { backgroundColor: '#1e293b', margin: 16, borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { color: '#f8fafc', fontWeight: '700', marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: '#0f172a' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 },
  saveBtn: { backgroundColor: '#6366f1' },
});
