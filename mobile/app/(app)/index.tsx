import { useEffect, useState, useCallback } from 'react';
import {
  ScrollView, StyleSheet, View, RefreshControl, Dimensions,
  TouchableOpacity, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  Text, Surface, ActivityIndicator, FAB, Portal,
  TextInput, Button, HelperText,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useIsFocused } from '@react-navigation/native';

import DashboardService from '../../services/dashboardService';
import ExpenseService from '../../services/expenseService';
import IncomeService from '../../services/incomeService';
import CategoryService from '../../services/categoryService';
import IncomeCategoryService from '../../services/incomeCategoryService';
import { useNotification } from '../../context/NotificationContext';
import DropdownSelect from '../../components/DropdownSelect';
import { PAYMENT_MODES, getPaymentModeLabel } from '../../constants/paymentModes';
import SyncStatusBanner from '../../components/SyncStatusBanner';
import syncService from '../../services/offline/syncService';
import OfflineStorage, { STORAGE_KEYS } from '../../services/offline/offlineStorage';

const { width } = Dimensions.get('window');
const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#a855f7'];

const fmt = (val: any, hide: boolean) =>
  hide ? '₹ ••••' : `₹${Number(val ?? 0).toFixed(2)}`;

type ModalType = 'expense' | 'income' | null;

export default function DashboardScreen() {
  const isFocused = useIsFocused();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Hidden by default for privacy
  const [hideNumbers, setHideNumbers] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Quick-add form
  const [categories, setCategories] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    amount: '',
    merchant: '',
    source: '',
    description: '',
    categoryId: '',
    paymentMode: 'CASH',
    date: new Date(),
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const { showNotification } = useNotification();

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      syncService.syncQueue().catch(() => {});
    }
    try {
      const result = await DashboardService.get();
      if (result) setData(result);
    } catch {
      showNotification('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // 1. Instantly render from local cache (< 5ms)
    OfflineStorage.get(STORAGE_KEYS.DASHBOARD).then((cached) => {
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    });
    CategoryService.list().then(setCategories).catch(() => {});
    IncomeCategoryService.list().then(setIncomeCategories).catch(() => {});

    // 2. Revalidate in background
    loadData();
  }, []);

  const openModal = (type: ModalType) => {
    setModalType(type);
    setForm({
      amount: '',
      merchant: '',
      source: '',
      description: '',
      categoryId: '',
      paymentMode: 'CASH',
      date: new Date(),
    });
    setFormError('');
    setFabOpen(false);
  };

  const handleSave = async () => {
    const parsed = parseFloat(form.amount);
    if (!form.amount || isNaN(parsed) || parsed <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const dateFormatted = format(form.date, 'yyyy-MM-dd');
      let res;
      if (modalType === 'expense') {
        res = await ExpenseService.create({
          amount: parsed,
          merchant: form.merchant.trim() || null,
          description: form.description.trim() || null,
          categoryId: form.categoryId ? parseInt(form.categoryId) : null,
          expenseDate: dateFormatted,
          paymentMode: form.paymentMode || 'CASH',
        });
        showNotification(
          res?._isPendingSync ? 'Saved locally (Offline). Will sync when connected.' : 'Expense added ✓',
          'success'
        );
      } else {
        res = await IncomeService.create({
          amount: parsed,
          source: form.source.trim() || null,
          description: form.description.trim() || null,
          incomeCategoryId: form.categoryId ? parseInt(form.categoryId) : null,
          incomeDate: dateFormatted,
        });
        showNotification(
          res?._isPendingSync ? 'Saved locally (Offline). Will sync when connected.' : 'Income added ✓',
          'success'
        );
      }
      setModalType(null);
      loadData();
    } catch (e: any) {
      setFormError(e?.friendlyMessage || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const todayTotal = Number(data?.todayTotal ?? 0);
  const monthExpense = Number(data?.currentMonthTotal ?? 0);
  const monthIncome = Number(data?.currentMonthIncome ?? 0);
  const monthNet = Number(data?.currentMonthNet ?? 0);

  const pieData = (data?.topSpendingCategories ?? []).slice(0, 6).map((c: any, i: number) => ({
    name: c.categoryName?.length > 10 ? c.categoryName.slice(0, 10) + '…' : (c.categoryName ?? '?'),
    population: Number(c.total ?? 0),
    color: c.categoryColor || CHART_COLORS[i % CHART_COLORS.length],
    legendFontColor: '#94a3b8',
    legendFontSize: 11,
  })).filter((d: any) => d.population > 0);

  const recentExpenses = data?.recentExpenses ?? [];
  const categoryOptions = (modalType === 'income' ? incomeCategories : categories)
    .filter((c) => c.status !== 'ARCHIVED')
    .map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <>
      <SyncStatusBanner />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#6366f1" />}
      >
        {/* Header row with hide toggle */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Dashboard</Text>
            <Text style={styles.greetingSub}>Your finances at a glance</Text>
          </View>
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setHideNumbers(h => !h)}>
            <MaterialCommunityIcons
              name={hideNumbers ? 'eye-off' : 'eye'}
              size={22}
              color={hideNumbers ? '#6366f1' : '#64748b'}
            />
            <Text style={[styles.eyeLabel, hideNumbers && styles.eyeLabelActive]}>
              {hideNumbers ? 'Show' : 'Hide'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today hero card */}
        <Surface style={styles.heroCard} elevation={2}>
          <Text style={styles.heroLabel}>Today's Spending</Text>
          <Text style={[styles.heroValue, { color: todayTotal > 0 ? '#ef4444' : '#10b981' }]}>
            {hideNumbers ? '₹ ••••••' : `₹${todayTotal.toFixed(2)}`}
          </Text>
          <Text style={styles.heroSub}>
            {hideNumbers ? 'Income hidden' : `₹${monthIncome.toFixed(2)} income this month`}
          </Text>
        </Surface>

        {/* Summary cards */}
        <View style={styles.cardRow}>
          <SummaryCard label="Month Expense" value={fmt(monthExpense, hideNumbers)} icon="trending-down" color="#ef4444" />
          <SummaryCard label="Month Income" value={fmt(monthIncome, hideNumbers)} icon="trending-up" color="#10b981" />
        </View>
        <View style={styles.cardRow}>
          <SummaryCard
            label="Net Savings"
            value={hideNumbers ? '₹ ••••' : `${monthNet >= 0 ? '+' : '-'}₹${Math.abs(monthNet).toFixed(2)}`}
            icon="scale-balance"
            color={monthNet >= 0 ? '#10b981' : '#ef4444'}
          />
          <SummaryCard label="Year Expense" value={fmt(data?.currentYearTotal, hideNumbers)} icon="calendar" color="#f59e0b" />
        </View>

        {/* Spending by category */}
        {pieData.length > 0 && (
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.cardTitle}>Top Spending Categories</Text>
            {hideNumbers ? (
              <View style={styles.hiddenPlaceholder}>
                <MaterialCommunityIcons name="eye-off" size={28} color="#334155" />
                <Text style={styles.hiddenText}>Tap 'Show' to reveal</Text>
              </View>
            ) : (
              <>
                <PieChart
                  data={pieData}
                  width={width - 64}
                  height={180}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="10"
                  absolute={false}
                />
                {(data?.topSpendingCategories ?? []).map((cat: any, i: number) => (
                  <View key={i} style={styles.catRow}>
                    <View style={[styles.catDot, { backgroundColor: cat.categoryColor || CHART_COLORS[i % CHART_COLORS.length] }]} />
                    <Text style={styles.catName} numberOfLines={1}>{cat.categoryName}</Text>
                    <Text style={styles.catAmount}>{fmt(cat.total, hideNumbers)}</Text>
                  </View>
                ))}
              </>
            )}
          </Surface>
        )}

        {/* Recent Expenses */}
        {recentExpenses.length > 0 && (
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.cardTitle}>Recent Expenses</Text>
            {recentExpenses.slice(0, 8).map((e: any) => {
              const title = e.merchant || e.description || e.category?.name || e.categoryName || 'Expense';
              const metaParts = [
                e.category?.name || e.categoryName,
                e.expenseDate || e.date,
                e._isPendingSync || e.id < 0 ? '⏳ Pending Sync' : null,
                e.merchant && e.description ? e.description : null,
              ].filter(Boolean);

              return (
                <View key={e.id} style={styles.recentRow}>
                  <View style={styles.recentLeft}>
                    <Text style={styles.recentDesc} numberOfLines={1}>{title}</Text>
                    <Text style={styles.recentMeta}>{metaParts.join(' · ')}</Text>
                  </View>
                  <Text style={styles.recentAmount}>{fmt(e.amount, hideNumbers)}</Text>
                </View>
              );
            })}
          </Surface>
        )}

        {pieData.length === 0 && recentExpenses.length === 0 && (
          <Surface style={styles.card} elevation={1}>
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="chart-line" size={48} color="#334155" />
              <Text style={styles.emptyText}>No data yet. Tap + to add your first expense!</Text>
            </View>
          </Surface>
        )}

        {/* Bottom padding for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB speed dial - VISIBLE ONLY WHEN DASHBOARD TAB IS FOCUSED */}
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible={isFocused && modalType === null}
          icon={fabOpen ? 'close' : 'plus'}
          fabStyle={styles.fab}
          color="#fff"
          actions={[
            {
              icon: 'trending-up',
              label: 'Add Income',
              onPress: () => openModal('income'),
              style: { backgroundColor: '#10b981' },
              color: '#fff',
            },
            {
              icon: 'trending-down',
              label: 'Add Expense',
              onPress: () => openModal('expense'),
              style: { backgroundColor: '#ef4444' },
              color: '#fff',
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
        />
      </Portal>

      {/* Quick-add modal */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalType(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons
                name={modalType === 'income' ? 'trending-up' : 'trending-down'}
                size={20}
                color={modalType === 'income' ? '#10b981' : '#ef4444'}
              />
              <Text style={styles.modalTitle}>
                {modalType === 'income' ? 'Add Income' : 'Add Expense'}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)}>
                <MaterialCommunityIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
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

              {/* Date Field */}
              <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                <View>
                  <Text style={styles.dateLabel}>Date *</Text>
                  <Text style={styles.dateValue}>{format(form.date, 'yyyy-MM-dd')}</Text>
                </View>
                <MaterialCommunityIcons name="calendar" size={22} color="#6366f1" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={form.date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setForm({ ...form, date: selectedDate });
                  }}
                />
              )}

              {/* Category Dropdown */}
              <DropdownSelect
                label="Category (optional)"
                value={form.categoryId}
                options={categoryOptions}
                onSelect={(val) => setForm({ ...form, categoryId: val })}
                placeholder="Select Category"
                allowClear
              />

              {/* Payment Mode Dropdown (Expense only) */}
              {modalType === 'expense' && (
                <DropdownSelect
                  label="Payment Mode *"
                  value={form.paymentMode}
                  options={PAYMENT_MODES}
                  onSelect={(val) => setForm({ ...form, paymentMode: val })}
                  placeholder="Select Payment Mode"
                  allowClear={false}
                />
              )}

              {modalType === 'expense' && (
                <TextInput
                  label="Merchant (optional)"
                  value={form.merchant}
                  onChangeText={(v) => setForm({ ...form, merchant: v })}
                  mode="outlined"
                  style={styles.input}
                  placeholder="e.g. Amazon, Supermarket"
                  theme={{ colors: { background: '#0f172a' } }}
                />
              )}

              {modalType === 'income' && (
                <TextInput
                  label="Payer / Source (optional)"
                  value={form.source}
                  onChangeText={(v) => setForm({ ...form, source: v })}
                  mode="outlined"
                  style={styles.input}
                  placeholder="e.g. Company name, Client"
                  theme={{ colors: { background: '#0f172a' } }}
                />
              )}

              <TextInput
                label="Description / notes (optional)"
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                mode="outlined"
                style={styles.input}
                theme={{ colors: { background: '#0f172a' } }}
              />

              {formError ? <HelperText type="error" visible>{formError}</HelperText> : null}

              <View style={styles.modalButtons}>
                <Button onPress={() => setModalType(null)} textColor="#64748b">Cancel</Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={saving}
                  style={{ backgroundColor: modalType === 'income' ? '#10b981' : '#6366f1' }}
                >
                  Save
                </Button>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <Surface style={styles.summaryCard} elevation={2}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </Surface>
  );
}

const chartConfig = {
  backgroundColor: '#1e293b',
  backgroundGradientFrom: '#1e293b',
  backgroundGradientTo: '#1e293b',
  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
  labelColor: () => '#94a3b8',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { color: '#f8fafc', fontWeight: '700', fontSize: 22 },
  greetingSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  eyeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  eyeLabel: { color: '#64748b', fontSize: 13 },
  eyeLabelActive: { color: '#6366f1', fontWeight: '600' },

  heroCard: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: '#334155', alignItems: 'center',
  },
  heroLabel: { color: '#94a3b8', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  heroValue: { fontSize: 36, fontWeight: '700', marginVertical: 8 },
  heroSub: { color: '#475569', fontSize: 12 },

  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 14, padding: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: '#334155' },
  summaryLabel: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  summaryValue: { fontWeight: '700', fontSize: 14, marginTop: 4 },

  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { color: '#f8fafc', fontWeight: '600', fontSize: 15, marginBottom: 12 },
  hiddenPlaceholder: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  hiddenText: { color: '#475569', fontSize: 13 },

  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#334155' },
  catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  catName: { color: '#cbd5e1', flex: 1, fontSize: 13 },
  catAmount: { color: '#f8fafc', fontWeight: '600', fontSize: 13 },

  recentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#334155' },
  recentLeft: { flex: 1, marginRight: 12 },
  recentDesc: { color: '#f8fafc', fontWeight: '600', fontSize: 14 },
  recentMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  recentAmount: { color: '#ef4444', fontWeight: '700', fontSize: 14 },

  emptyState: { alignItems: 'center', padding: 24, gap: 12 },
  emptyText: { color: '#475569', textAlign: 'center', fontSize: 14 },

  fab: { backgroundColor: '#6366f1' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  modalTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 18, flex: 1 },
  input: { marginBottom: 12, backgroundColor: '#0f172a' },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  dateLabel: { color: '#94a3b8', fontSize: 12 },
  dateValue: { color: '#f8fafc', fontSize: 15, fontWeight: '500', marginTop: 2 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 },
});
