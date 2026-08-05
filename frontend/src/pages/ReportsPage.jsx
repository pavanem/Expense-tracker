import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import SummaryCard from '../components/common/SummaryCard';
import CategoryChip from '../components/common/CategoryChip';
import Amount from '../components/common/Amount';
import ReportService from '../services/reportService';
import useCategories from '../hooks/useCategories';
import useIncomeCategories from '../hooks/useIncomeCategories';
import { useNotification } from '../context/NotificationContext';
import { PAYMENT_MODES } from '../utils/constants';
import { todayIso } from '../utils/format';
import { tokens } from '../theme/theme';

const REPORT_SUBJECTS = [
  { value: 'expenses', label: 'Expenses' },
  { value: 'income', label: 'Income' },
  { value: 'comparison', label: 'Income vs Expenses' },
];

const REPORT_TYPES = [
  { value: 'daily', label: 'Day' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
  { value: 'range', label: 'Range' },
];

const COMPARISON_COLORS = {
  income: '#10b981',
  expense: '#ef4444',
  savings: '#3b82f6',
  savingsNeg: '#f97316',
};

const currentYear = new Date().getFullYear();

const formatCurrency = (value) => {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

export default function ReportsPage() {
  const { categories } = useCategories(true);
  const { incomeCategories } = useIncomeCategories(true);
  const { notify, notifyError } = useNotification();

  const [subject, setSubject] = useState('expenses');
  const [reportType, setReportType] = useState('monthly');
  const [date, setDate] = useState(todayIso());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [categoryId, setCategoryId] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [merchant, setMerchant] = useState('');

  const [report, setReport] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);

  const isComparison = subject === 'comparison';

  const commonFilters = () => ({
    categoryId: categoryId || undefined,
    paymentMode: subject === 'expenses' ? (paymentMode || undefined) : undefined,
    merchant: merchant || undefined,
  });

  const getTimeParams = () => {
    if (reportType === 'daily') return { date };
    if (reportType === 'monthly') return { month, year };
    if (reportType === 'yearly') return { year };
    return { startDate, endDate };
  };

  const fetchReport = async (isIncome, filters) => {
    const timeParams = getTimeParams();
    const params = { ...timeParams, ...filters };
    if (reportType === 'daily') return isIncome ? ReportService.incomeDaily(params) : ReportService.daily(params);
    if (reportType === 'monthly') return isIncome ? ReportService.incomeMonthly(params) : ReportService.monthly(params);
    if (reportType === 'yearly') return isIncome ? ReportService.incomeYearly(params) : ReportService.yearly(params);
    return isIncome ? ReportService.incomeRange(params) : ReportService.range(params);
  };

  const generate = async () => {
    setLoading(true);
    try {
      if (isComparison) {
        const expenseFilters = { paymentMode: paymentMode || undefined, merchant: merchant || undefined };
        const incomeFilters = { merchant: merchant || undefined };

        const [expenseReport, incomeReport] = await Promise.all([
          fetchReport(false, expenseFilters),
          fetchReport(true, incomeFilters),
        ]);

        const totalIncome = Number(incomeReport.totalExpenses ?? 0);
        const totalExpense = Number(expenseReport.totalExpenses ?? 0);
        const netBalance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : '0.0';

        // Merge daily/monthly/yearly breakdowns for side-by-side chart
        const mergedBreakdown = mergeBreakdowns(expenseReport, incomeReport, reportType);

        setComparisonData({
          expenseReport,
          incomeReport,
          totalIncome,
          totalExpense,
          netBalance,
          savingsRate: parseFloat(savingsRate),
          mergedBreakdown,
          incomeTransactions: incomeReport.numberOfTransactions,
          expenseTransactions: expenseReport.numberOfTransactions,
          avgDailyIncome: Number(incomeReport.averageDailySpending ?? 0),
          avgDailyExpense: Number(expenseReport.averageDailySpending ?? 0),
          highestIncome: Number(incomeReport.highestExpense ?? 0),
          highestExpense: Number(expenseReport.highestExpense ?? 0),
        });
        setReport(null);
      } else {
        const isIncome = subject === 'income';
        const data = await fetchReport(isIncome, commonFilters());
        setReport(data);
        setComparisonData(null);
      }
    } catch (err) {
      notifyError(err, 'Could not generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      const params = { ...commonFilters() };
      if (reportType === 'daily') params.date = date;
      else if (reportType === 'monthly') {
        params.month = month;
        params.year = year;
      } else if (reportType === 'yearly') params.year = year;
      else {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const filename = await ReportService.exportCsv(params);
      notify(`Downloaded ${filename}`);
    } catch (err) {
      notifyError(err, 'Could not export CSV');
    }
  };

  const exportAll = async () => {
    try {
      const filename = await ReportService.exportCsv({ all: true });
      notify(`Downloaded ${filename}`);
    } catch (err) {
      notifyError(err, 'Could not export CSV');
    }
  };

  const chartData =
    report?.dailyBreakdown?.length > 0
      ? report.dailyBreakdown.map((p) => ({ label: p.date, total: p.total }))
      : report?.monthlyBreakdown?.length > 0
        ? report.monthlyBreakdown.map((p) => ({ label: p.month, total: p.total }))
        : (report?.yearlyBreakdown || []).map((p) => ({ label: String(p.year), total: p.total }));

  const activeCategories = subject === 'income' ? incomeCategories : categories;

  const showCategoryFilter = !isComparison;
  const showPaymentFilter = subject === 'expenses';

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Break down spending and income by day, month, year, category, or range."
        action={
          <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={exportAll}>
            Export entire database
          </Button>
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={2} flexWrap="wrap" gap={1}>
              <ToggleButtonGroup
                value={subject}
                exclusive
                onChange={(_e, val) => {
                  if (val) {
                    setSubject(val);
                    setCategoryId('');
                    setReport(null);
                    setComparisonData(null);
                  }
                }}
                color="primary"
                size="small"
              >
                {REPORT_SUBJECTS.map((s) => (
                  <ToggleButton key={s.value} value={s.value} sx={{ px: 2.5, fontWeight: 600 }}>
                    {s.value === 'comparison' && <CompareArrowsRoundedIcon sx={{ mr: 0.5, fontSize: 18 }} />}
                    {s.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <ToggleButtonGroup
                value={reportType}
                exclusive
                onChange={(_e, val) => val && setReportType(val)}
                size="small"
              >
                {REPORT_TYPES.map((t) => (
                  <ToggleButton key={t.value} value={t.value}>
                    {t.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>

            <Grid container spacing={2}>
              {reportType === 'daily' && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    size="small"
                  />
                </Grid>
              )}
              {reportType === 'monthly' && (
                <>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      select
                      label="Month"
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      fullWidth
                      size="small"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <MenuItem key={m} value={m}>
                          {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      label="Year"
                      type="number"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </>
              )}
              {reportType === 'yearly' && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    fullWidth
                    size="small"
                  />
                </Grid>
              )}
              {reportType === 'range' && (
                <>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      label="From"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      label="To"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </>
              )}

              {showCategoryFilter && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">All categories</MenuItem>
                    {activeCategories.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}

              {showPaymentFilter && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    label="Payment mode"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">All modes</MenuItem>
                    {PAYMENT_MODES.map((m) => (
                      <MenuItem key={m.value} value={m.value}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}

              {!isComparison && (
                <Grid item xs={12} sm={4}>
                  <TextField
                    label={subject === 'income' ? 'Source contains' : 'Merchant contains'}
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
              )}
            </Grid>

            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" startIcon={<AssessmentRoundedIcon />} onClick={generate}>
                Generate report
              </Button>
              {report && subject === 'expenses' && (
                <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={exportCsv}>
                  Export this report
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* ── Single-subject report (Expenses or Income) ── */}
      {report && !isComparison && (
        <>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={6} md={2.4}>
              <SummaryCard
                label={subject === 'income' ? 'Total Income' : 'Total Expenses'}
                value={report.totalExpenses}
                accent={subject === 'income' ? '#10b981' : tokens.color.ink}
              />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <SummaryCard label="Avg / day" value={report.averageDailySpending} accent={tokens.color.credit} />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <SummaryCard label="Highest" value={report.highestExpense} accent={tokens.color.amber} />
            </Grid>
            <Grid item xs={6} md={2.4}>
              <SummaryCard label="Lowest" value={report.lowestExpense} />
            </Grid>
            <Grid item xs={12} md={2.4}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Transactions
                  </Typography>
                  <Typography variant="h4" sx={{ fontFamily: tokens.font.mono, fontWeight: 600, fontSize: { xs: '1.25rem', sm: '2.125rem' } }}>
                    {report.numberOfTransactions}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2.5}>
            <Grid item xs={12} md={7}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Trend
                  </Typography>
                  <Box sx={{ height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.color.border} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} width={40} />
                        <RechartsTooltip formatter={(value) => [`₹${value}`, 'Total']} />
                        <Bar dataKey="total" fill={subject === 'income' ? '#10b981' : tokens.color.credit} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    By category
                  </Typography>
                  <Stack spacing={1.5}>
                    {(report.categoryBreakdown || []).map((cat) => (
                      <Stack key={cat.categoryId} direction="row" justifyContent="space-between" alignItems="center">
                        <CategoryChip name={cat.categoryName} color={cat.categoryColor} />
                        <Amount value={cat.total} size="body2" />
                      </Stack>
                    ))}
                    {(report.categoryBreakdown || []).length === 0 && (
                      <Typography color="text.secondary">No records in this window.</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* ── Comparison report (Income vs Expenses) ── */}
      {comparisonData && isComparison && (
        <ComparisonView data={comparisonData} reportType={reportType} />
      )}
    </Box>
  );
}

/* ── Helper: merge expense + income breakdowns into a combined dataset ── */
function mergeBreakdowns(expenseReport, incomeReport, type) {
  const map = new Map();

  const getBreakdown = (report, keyFn) => {
    if (type === 'daily' && report.dailyBreakdown?.length > 0) return report.dailyBreakdown.map((p) => ({ key: p.date, total: Number(p.total) }));
    if ((type === 'monthly' || type === 'range') && report.monthlyBreakdown?.length > 0) return report.monthlyBreakdown.map((p) => ({ key: p.month, total: Number(p.total) }));
    if (type === 'yearly' && report.yearlyBreakdown?.length > 0) return report.yearlyBreakdown.map((p) => ({ key: String(p.year), total: Number(p.total) }));
    // Fallback: try daily
    if (report.dailyBreakdown?.length > 0) return report.dailyBreakdown.map((p) => ({ key: p.date, total: Number(p.total) }));
    if (report.monthlyBreakdown?.length > 0) return report.monthlyBreakdown.map((p) => ({ key: p.month, total: Number(p.total) }));
    return (report.yearlyBreakdown || []).map((p) => ({ key: String(p.year), total: Number(p.total) }));
  };

  const expenseBreakdown = getBreakdown(expenseReport);
  const incomeBreakdown = getBreakdown(incomeReport);

  for (const item of expenseBreakdown) {
    map.set(item.key, { label: item.key, expense: item.total, income: 0 });
  }
  for (const item of incomeBreakdown) {
    if (map.has(item.key)) {
      map.get(item.key).income = item.total;
    } else {
      map.set(item.key, { label: item.key, expense: 0, income: item.total });
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

/* ── Comparison View component ── */
function ComparisonView({ data, reportType }) {
  const {
    totalIncome, totalExpense, netBalance, savingsRate,
    mergedBreakdown, incomeTransactions, expenseTransactions,
    avgDailyIncome, avgDailyExpense, highestIncome, highestExpense,
    expenseReport, incomeReport,
  } = data;

  const isPositiveBalance = netBalance >= 0;

  // Pie chart data for income vs expense split
  const pieData = [
    { name: 'Income', value: totalIncome, color: COMPARISON_COLORS.income },
    { name: 'Expenses', value: totalExpense, color: COMPARISON_COLORS.expense },
  ].filter((d) => d.value > 0);

  return (
    <>
      {/* ── Top stat cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: `4px solid ${COMPARISON_COLORS.income}` }}>
            <CardContent>
              <Stack spacing={0.5}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <TrendingUpRoundedIcon sx={{ fontSize: 18, color: COMPARISON_COLORS.income }} />
                  <Typography variant="overline" color="text.secondary">Total Income</Typography>
                </Stack>
                <Amount value={totalIncome} size="h5" color={COMPARISON_COLORS.income} />
                <Typography variant="caption" color="text.secondary">
                  {incomeTransactions} transaction{incomeTransactions !== 1 ? 's' : ''}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: `4px solid ${COMPARISON_COLORS.expense}` }}>
            <CardContent>
              <Stack spacing={0.5}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <TrendingDownRoundedIcon sx={{ fontSize: 18, color: COMPARISON_COLORS.expense }} />
                  <Typography variant="overline" color="text.secondary">Total Expenses</Typography>
                </Stack>
                <Amount value={totalExpense} size="h5" color={COMPARISON_COLORS.expense} />
                <Typography variant="caption" color="text.secondary">
                  {expenseTransactions} transaction{expenseTransactions !== 1 ? 's' : ''}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: `4px solid ${isPositiveBalance ? COMPARISON_COLORS.savings : COMPARISON_COLORS.savingsNeg}` }}>
            <CardContent>
              <Stack spacing={0.5}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <SavingsRoundedIcon sx={{ fontSize: 18, color: isPositiveBalance ? COMPARISON_COLORS.savings : COMPARISON_COLORS.savingsNeg }} />
                  <Typography variant="overline" color="text.secondary">
                    {isPositiveBalance ? 'Balance Left' : 'Deficit'}
                  </Typography>
                </Stack>
                <Amount
                  value={Math.abs(netBalance)}
                  size="h5"
                  color={isPositiveBalance ? COMPARISON_COLORS.savings : COMPARISON_COLORS.savingsNeg}
                />
                <Chip
                  size="small"
                  label={isPositiveBalance ? 'Surplus' : 'Over budget'}
                  sx={{
                    width: 'fit-content',
                    bgcolor: isPositiveBalance ? '#dcfce7' : '#fef2f2',
                    color: isPositiveBalance ? '#166534' : '#991b1b',
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ borderLeft: `4px solid ${tokens.color.amber}` }}>
            <CardContent>
              <Stack spacing={0.5}>
                <Typography variant="overline" color="text.secondary">Savings Rate</Typography>
                <Typography variant="h5" sx={{ fontFamily: tokens.font.mono, fontWeight: 600, color: tokens.color.amber, fontSize: { xs: '1rem', sm: '1.5rem' } }}>
                  {savingsRate}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  of income retained
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Detailed stats row ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Avg daily income</Typography>
              <Amount value={avgDailyIncome} size="h6" color={COMPARISON_COLORS.income} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Avg daily expense</Typography>
              <Amount value={avgDailyExpense} size="h6" color={COMPARISON_COLORS.expense} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Highest income</Typography>
              <Amount value={highestIncome} size="h6" color={COMPARISON_COLORS.income} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Highest expense</Typography>
              <Amount value={highestExpense} size="h6" color={COMPARISON_COLORS.expense} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Charts row ── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Income vs Expenses — Trend
              </Typography>
              <Box sx={{ height: 300 }}>
                {mergedBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mergedBreakdown} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.color.border} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={50} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip
                        formatter={(value, name) => [formatCurrency(value), name === 'income' ? 'Income' : 'Expenses']}
                        contentStyle={{ borderRadius: 8, border: `1px solid ${tokens.color.border}` }}
                      />
                      <Legend formatter={(value) => (value === 'income' ? 'Income' : 'Expenses')} />
                      <Bar dataKey="income" fill={COMPARISON_COLORS.income} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill={COMPARISON_COLORS.expense} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                    <Typography color="text.secondary">No data for this period.</Typography>
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Split
              </Typography>
              {pieData.length > 0 ? (
                <Box sx={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {pieData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography color="text.secondary">No data.</Typography>
              )}
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Income share</Typography>
                  <Typography variant="body2" sx={{ fontFamily: tokens.font.mono, fontWeight: 600 }}>
                    {totalIncome + totalExpense > 0 ? ((totalIncome / (totalIncome + totalExpense)) * 100).toFixed(1) : '0.0'}%
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">Expense share</Typography>
                  <Typography variant="body2" sx={{ fontFamily: tokens.font.mono, fontWeight: 600 }}>
                    {totalIncome + totalExpense > 0 ? ((totalExpense / (totalIncome + totalExpense)) * 100).toFixed(1) : '0.0'}%
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Category breakdowns side by side ── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: COMPARISON_COLORS.income }}>
                Income by Category
              </Typography>
              <Stack spacing={1.5}>
                {(incomeReport.categoryBreakdown || []).map((cat) => (
                  <Stack key={cat.categoryId} direction="row" justifyContent="space-between" alignItems="center">
                    <CategoryChip name={cat.categoryName} color={cat.categoryColor} />
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Amount value={cat.total} size="body2" />
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: tokens.font.mono, minWidth: 44, textAlign: 'right' }}>
                        {totalIncome > 0 ? ((Number(cat.total) / totalIncome) * 100).toFixed(1) : '0.0'}%
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
                {(incomeReport.categoryBreakdown || []).length === 0 && (
                  <Typography color="text.secondary">No income in this period.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: COMPARISON_COLORS.expense }}>
                Expenses by Category
              </Typography>
              <Stack spacing={1.5}>
                {(expenseReport.categoryBreakdown || []).map((cat) => (
                  <Stack key={cat.categoryId} direction="row" justifyContent="space-between" alignItems="center">
                    <CategoryChip name={cat.categoryName} color={cat.categoryColor} />
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Amount value={cat.total} size="body2" />
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: tokens.font.mono, minWidth: 44, textAlign: 'right' }}>
                        {totalExpense > 0 ? ((Number(cat.total) / totalExpense) * 100).toFixed(1) : '0.0'}%
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
                {(expenseReport.categoryBreakdown || []).length === 0 && (
                  <Typography color="text.secondary">No expenses in this period.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
