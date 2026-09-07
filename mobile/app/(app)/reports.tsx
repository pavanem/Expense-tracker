import { useState, useCallback } from 'react';
import {
  ScrollView, StyleSheet, View, Dimensions, TouchableOpacity, Share,
} from 'react-native';
import {
  Text, Surface, Button, Chip, ActivityIndicator, Divider,
} from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ReportService from '../../services/reportService';
import { useNotification } from '../../context/NotificationContext';

const { width } = Dimensions.get('window');

const MODES = ['monthly', 'yearly', 'range'] as const;
type Mode = typeof MODES[number];
const SUBJECTS = ['expenses', 'income'] as const;
type Subject = typeof SUBJECTS[number];

const fmt = (val: any) => `₹${Number(val ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function ReportsScreen() {
  const { showNotification } = useNotification();
  const [mode, setMode] = useState<Mode>('monthly');
  const [subject, setSubject] = useState<Subject>('expenses');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setReport(null);
    try {
      const isIncome = subject === 'income';
      let data: any;
      if (mode === 'monthly') {
        data = isIncome
          ? await ReportService.incomeMonthly({ month, year })
          : await ReportService.monthly({ month, year });
      } else if (mode === 'yearly') {
        data = isIncome
          ? await ReportService.incomeYearly({ year })
          : await ReportService.yearly({ year });
      } else {
        data = isIncome
          ? await ReportService.incomeRange({ startDate, endDate })
          : await ReportService.range({ startDate, endDate });
      }
      setReport(data);
    } catch {
      showNotification('Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  }, [mode, subject, month, year, startDate, endDate]);

  const handleExportCSV = async () => {
    try {
      const params: any = {};
      if (mode === 'monthly') { params.month = month; params.year = year; }
      else if (mode === 'yearly') { params.year = year; }
      else { params.startDate = startDate; params.endDate = endDate; }
      const blob = await ReportService.exportCsv(params);
      await Share.share({ message: `Expense data exported:\n${blob}` });
    } catch {
      showNotification('Export failed', 'error');
    }
  };

  // Build chart data from report
  const chartLabels: string[] = [];
  const chartValues: number[] = [];
  if (report) {
    if (report.dailyBreakdown?.length > 0) {
      report.dailyBreakdown.slice(-14).forEach((p: any) => {
        chartLabels.push(String(p.date).slice(5)); // MM-DD
        chartValues.push(Number(p.total ?? 0));
      });
    } else if (report.monthlyBreakdown?.length > 0) {
      report.monthlyBreakdown.forEach((p: any) => {
        chartLabels.push(String(p.month).slice(5)); // MM
        chartValues.push(Number(p.total ?? 0));
      });
    } else if (report.yearlyBreakdown?.length > 0) {
      report.yearlyBreakdown.forEach((p: any) => {
        chartLabels.push(String(p.year));
        chartValues.push(Number(p.total ?? 0));
      });
    }
  }

  const hasChart = chartLabels.length > 0;
  const isIncome = subject === 'income';
  const accentColor = isIncome ? '#10b981' : '#ef4444';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Filter controls */}
      <Surface style={styles.card} elevation={2}>
        <Text style={styles.cardTitle}>Generate Report</Text>

        {/* Subject toggle */}
        <View style={styles.row}>
          {SUBJECTS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.toggleBtn, subject === s && styles.toggleBtnActive]}
              onPress={() => setSubject(s)}
            >
              <MaterialCommunityIcons
                name={s === 'income' ? 'trending-up' : 'trending-down'}
                size={16}
                color={subject === s ? '#fff' : '#94a3b8'}
              />
              <Text style={[styles.toggleText, subject === s && styles.toggleTextActive]}>
                {s === 'income' ? 'Income' : 'Expenses'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mode selector chips */}
        <View style={styles.chipRow}>
          {MODES.map((m) => (
            <Chip
              key={m}
              selected={mode === m}
              onPress={() => setMode(m)}
              style={[styles.modeChip, mode === m && styles.modeChipActive]}
              textStyle={{ color: mode === m ? '#fff' : '#94a3b8', fontSize: 12 }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Chip>
          ))}
        </View>

        {/* Month/Year pickers */}
        {mode === 'monthly' && (
          <View style={styles.pickerRow}>
            <View style={styles.pickerItem}>
              <Text style={styles.pickerLabel}>Month</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setMonth(m => Math.max(1, m - 1))}>
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#6366f1" />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>
                  {new Date(2000, month - 1, 1).toLocaleString('en', { month: 'short' })}
                </Text>
                <TouchableOpacity onPress={() => setMonth(m => Math.min(12, m + 1))}>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#6366f1" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.pickerItem}>
              <Text style={styles.pickerLabel}>Year</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setYear(y => y - 1)}>
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#6366f1" />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{year}</Text>
                <TouchableOpacity onPress={() => setYear(y => Math.min(currentYear, y + 1))}>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#6366f1" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {mode === 'yearly' && (
          <View style={styles.pickerRow}>
            <View style={styles.pickerItem}>
              <Text style={styles.pickerLabel}>Year</Text>
              <View style={styles.stepper}>
                <TouchableOpacity onPress={() => setYear(y => y - 1)}>
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#6366f1" />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{year}</Text>
                <TouchableOpacity onPress={() => setYear(y => Math.min(currentYear, y + 1))}>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#6366f1" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {mode === 'range' && (
          <View style={{ marginTop: 12 }}>
            <View style={styles.rangeRow}>
              <Text style={styles.pickerLabel}>From</Text>
              <TextInputInline value={startDate} onChange={setStartDate} placeholder="YYYY-MM-DD" />
            </View>
            <View style={[styles.rangeRow, { marginTop: 8 }]}>
              <Text style={styles.pickerLabel}>To</Text>
              <TextInputInline value={endDate} onChange={setEndDate} placeholder="YYYY-MM-DD" />
            </View>
          </View>
        )}

        <Button
          mode="contained"
          onPress={generate}
          loading={loading}
          style={styles.generateBtn}
          icon="chart-bar"
        >
          Generate
        </Button>
      </Surface>

      {/* Loading */}
      {loading && <ActivityIndicator color="#6366f1" style={{ marginTop: 24 }} />}

      {/* Results */}
      {report && !loading && (
        <>
          {/* Summary stats */}
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.cardTitle}>Summary</Text>
            <View style={styles.statsGrid}>
              <StatBox
                label={isIncome ? 'Total Income' : 'Total Expenses'}
                value={fmt(report.totalExpenses)}
                color={accentColor}
                icon={isIncome ? 'trending-up' : 'trending-down'}
              />
              <StatBox
                label="Transactions"
                value={String(report.numberOfTransactions ?? 0)}
                color="#6366f1"
                icon="list-status"
              />
              <StatBox
                label="Avg / Day"
                value={fmt(report.averageDailySpending)}
                color="#f59e0b"
                icon="calendar-today"
              />
              <StatBox
                label="Highest"
                value={fmt(report.highestExpense)}
                color="#a855f7"
                icon="arrow-up-bold"
              />
              <StatBox
                label="Lowest"
                value={fmt(report.lowestExpense)}
                color="#22d3ee"
                icon="arrow-down-bold"
              />
            </View>
          </Surface>

          {/* Bar chart trend */}
          {hasChart && (
            <Surface style={styles.card} elevation={2}>
              <Text style={styles.cardTitle}>Trend</Text>
              <BarChart
                data={{
                  labels: chartLabels,
                  datasets: [{ data: chartValues }],
                }}
                width={width - 64}
                height={200}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: '#1e293b',
                  backgroundGradientFrom: '#1e293b',
                  backgroundGradientTo: '#1e293b',
                  decimalPlaces: 0,
                  color: () => accentColor,
                  labelColor: () => '#64748b',
                  barPercentage: 0.6,
                  propsForBackgroundLines: { stroke: '#334155' },
                }}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero
              />
            </Surface>
          )}

          {/* Category breakdown */}
          {(report.categoryBreakdown ?? []).length > 0 && (
            <Surface style={styles.card} elevation={2}>
              <Text style={styles.cardTitle}>By Category</Text>
              {(report.categoryBreakdown ?? []).map((cat: any, i: number) => {
                const total = Number(report.totalExpenses ?? 1);
                const pct = total > 0 ? ((Number(cat.total) / total) * 100).toFixed(1) : '0.0';
                return (
                  <View key={cat.categoryId ?? i}>
                    <View style={styles.catRow}>
                      <View style={[styles.catDot, { backgroundColor: cat.categoryColor || '#6366f1' }]} />
                      <Text style={styles.catName} numberOfLines={1}>{cat.categoryName}</Text>
                      <Text style={styles.catPct}>{pct}%</Text>
                      <Text style={styles.catAmount}>{fmt(cat.total)}</Text>
                    </View>
                    {/* Progress bar */}
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(100, parseFloat(pct))}%` as any, backgroundColor: cat.categoryColor || '#6366f1' },
                        ]}
                      />
                    </View>
                    {i < (report.categoryBreakdown.length - 1) && <Divider style={styles.divider} />}
                  </View>
                );
              })}
            </Surface>
          )}

          {/* Export CSV */}
          <Button
            mode="outlined"
            onPress={handleExportCSV}
            icon="download"
            style={styles.exportBtn}
            textColor="#6366f1"
          >
            Export CSV
          </Button>
        </>
      )}

      {/* Empty state */}
      {!report && !loading && (
        <Surface style={styles.emptyCard} elevation={1}>
          <MaterialCommunityIcons name="chart-bar" size={56} color="#334155" />
          <Text style={styles.emptyTitle}>No report yet</Text>
          <Text style={styles.emptyText}>Choose a period above and tap Generate</Text>
        </Surface>
      )}
    </ScrollView>
  );
}

function StatBox({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={styles.statBox}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TextInputInline({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { TextInput } = require('react-native-paper');
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      mode="outlined"
      style={{ flex: 1, marginLeft: 12, backgroundColor: '#0f172a', height: 40 }}
      theme={{ colors: { background: '#0f172a', text: '#f8fafc' } }}
      dense
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 15, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#334155',
  },
  toggleBtnActive: { backgroundColor: '#6366f1' },
  toggleText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  toggleTextActive: { color: '#fff' },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modeChip: { backgroundColor: '#334155' },
  modeChipActive: { backgroundColor: '#6366f1' },
  pickerRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  pickerItem: { flex: 1 },
  pickerLabel: { color: '#64748b', fontSize: 12, marginBottom: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 4, paddingVertical: 4 },
  stepperValue: { color: '#f8fafc', fontWeight: '700', fontSize: 15, minWidth: 44, textAlign: 'center' },
  rangeRow: { flexDirection: 'row', alignItems: 'center' },
  generateBtn: { backgroundColor: '#6366f1', marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: {
    width: (width - 80) / 3, backgroundColor: '#0f172a', borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#334155',
  },
  statValue: { color: '#f8fafc', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  statLabel: { color: '#64748b', fontSize: 10, textAlign: 'center' },
  chart: { borderRadius: 12, marginTop: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  catName: { color: '#cbd5e1', flex: 1, fontSize: 13 },
  catPct: { color: '#64748b', fontSize: 11, marginRight: 10, minWidth: 36, textAlign: 'right' },
  catAmount: { color: '#f8fafc', fontWeight: '600', fontSize: 13, minWidth: 80, textAlign: 'right' },
  progressBg: { height: 4, backgroundColor: '#334155', borderRadius: 2, marginBottom: 4 },
  progressFill: { height: 4, borderRadius: 2 },
  divider: { backgroundColor: '#334155', marginVertical: 2 },
  exportBtn: { borderColor: '#6366f1', marginTop: 4 },
  emptyCard: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 40,
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#334155',
  },
  emptyTitle: { color: '#94a3b8', fontWeight: '700', fontSize: 16 },
  emptyText: { color: '#475569', fontSize: 13, textAlign: 'center' },
});
