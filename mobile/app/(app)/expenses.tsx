import { useCallback, useEffect, useState } from 'react';
import {
  FlatList, StyleSheet, View, RefreshControl, TouchableOpacity, ScrollView,
} from 'react-native';
import {
  Text, FAB, Portal, Modal, TextInput, Button, Surface,
  Chip, HelperText, ActivityIndicator, IconButton,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import ExpenseService from '../../services/expenseService';
import CategoryService from '../../services/categoryService';
import { useNotification } from '../../context/NotificationContext';
import DropdownSelect from '../../components/DropdownSelect';
import { PAYMENT_MODES, getPaymentModeLabel } from '../../constants/paymentModes';

const PAGE_SIZE = 20;

export default function ExpensesScreen() {
  const { showNotification } = useNotification();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [form, setForm] = useState({
    amount: '',
    categoryId: '',
    date: new Date(),
    paymentMode: 'CASH',
    merchant: '',
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    try {
      const data = await CategoryService.list();
      setCategories(data);
    } catch {}
  };

  const loadExpenses = useCallback(async (pageNum = 0, isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); setPage(0); }
    try {
      const data = searchQuery.trim()
        ? await ExpenseService.search(searchQuery, { page: pageNum, size: PAGE_SIZE, sort: 'date,desc' })
        : await ExpenseService.list({ page: pageNum, size: PAGE_SIZE, sort: 'date,desc' });
      const items = data.content ?? data;
      if (isRefresh || pageNum === 0) setExpenses(items);
      else setExpenses((prev) => [...prev, ...items]);
      setHasMore(!data.last);
    } catch {
      showNotification('Failed to load expenses', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => { loadCategories(); loadExpenses(0); }, []);
  useEffect(() => { loadExpenses(0); }, [searchQuery]);

  const openAdd = () => {
    setEditingExpense(null);
    setForm({
      amount: '',
      categoryId: '',
      date: new Date(),
      paymentMode: 'CASH',
      merchant: '',
      description: '',
    });
    setFormError('');
    setModalVisible(true);
  };

  const openEdit = (expense: any) => {
    setEditingExpense(expense);
    const dateStr = expense.expenseDate ?? expense.date;
    const parsedDate = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    setForm({
      amount: String(Number(expense.amount)),
      categoryId: String(expense.category?.id ?? expense.categoryId ?? ''),
      date: parsedDate,
      paymentMode: expense.paymentMode ?? 'CASH',
      merchant: expense.merchant ?? '',
      description: expense.description ?? '',
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
        categoryId: form.categoryId ? parseInt(form.categoryId) : null,
        expenseDate: format(form.date, 'yyyy-MM-dd'),
        paymentMode: form.paymentMode || 'CASH',
        merchant: form.merchant.trim() || null,
        description: form.description.trim() || null,
      };
      if (editingExpense) {
        await ExpenseService.update(editingExpense.id, payload);
        showNotification('Expense updated', 'success');
      } else {
        await ExpenseService.create(payload);
        showNotification('Expense added', 'success');
      }
      setModalVisible(false);
      loadExpenses(0, true);
    } catch (e: any) {
      setFormError(e?.friendlyMessage || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await ExpenseService.remove(id);
      showNotification('Expense deleted', 'success');
      loadExpenses(0, true);
    } catch {
      showNotification('Failed to delete', 'error');
    }
  };

  const categoryOptions = categories
    .filter((c) => c.status !== 'ARCHIVED')
    .map((c) => ({ value: String(c.id), label: c.name }));

  const renderItem = ({ item }: any) => {
    const dateFormatted = item.expenseDate
      ? format(new Date(item.expenseDate + 'T00:00:00'), 'dd MMM yyyy')
      : (item.date ? format(new Date(item.date), 'dd MMM yyyy') : '');

    return (
      <Surface style={styles.item} elevation={1}>
        <View style={styles.itemHeader}>
          <View style={styles.badgesRow}>
            {item.category?.name ? (
              <View style={[styles.catBadge, { backgroundColor: item.category.color ? `${item.category.color}25` : '#334155' }]}>
                <View style={[styles.catDot, { backgroundColor: item.category.color || '#6366f1' }]} />
                <Text style={[styles.catText, { color: item.category.color || '#cbd5e1' }]}>
                  {item.category.name}
                </Text>
              </View>
            ) : null}
            <Chip compact style={styles.modeChip} textStyle={styles.modeChipText}>
              {getPaymentModeLabel(item.paymentMode)}
            </Chip>
          </View>
          <Text style={styles.itemAmount}>-₹{Number(item.amount ?? 0).toFixed(2)}</Text>
        </View>

        {/* Date */}
        <Text style={styles.itemDate}>{dateFormatted}</Text>

        {/* Merchant (Prominently displayed, exactly like web app) */}
        {item.merchant ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Merchant: </Text>
            <Text style={styles.merchantText}>{item.merchant}</Text>
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
        placeholder="Search expenses…"
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
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadExpenses(0, true)} tintColor="#6366f1" />}
          onEndReached={() => { if (hasMore) { const next = page + 1; setPage(next); loadExpenses(next); } }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<Text style={styles.empty}>No expenses found</Text>}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={openAdd} color="#fff" />

      {/* Add/Edit Modal */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text variant="titleLarge" style={styles.modalTitle}>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
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
              placeholder="Select Category"
              allowClear
            />

            <DropdownSelect
              label="Payment Mode *"
              value={form.paymentMode}
              options={PAYMENT_MODES}
              onSelect={(val) => setForm({ ...form, paymentMode: val })}
              placeholder="Select Payment Mode"
              allowClear={false}
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <TextInput
                label="Expense Date"
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
              label="Merchant (optional)"
              value={form.merchant}
              onChangeText={(v) => setForm({ ...form, merchant: v })}
              mode="outlined"
              style={styles.input}
              placeholder="e.g. Amazon, Supermarket"
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
  modeChip: {
    backgroundColor: '#334155',
    height: 22,
  },
  modeChipText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  itemAmount: {
    color: '#ef4444',
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
  merchantText: {
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

  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#6366f1' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 40 },
  modal: { backgroundColor: '#1e293b', margin: 16, borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { color: '#f8fafc', fontWeight: '700', marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: '#0f172a' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 },
  saveBtn: { backgroundColor: '#6366f1' },
});
