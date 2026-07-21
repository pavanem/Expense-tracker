import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../components/common/PageHeader';
import SummaryCard from '../components/common/SummaryCard';
import CategoryChip from '../components/common/CategoryChip';
import Amount from '../components/common/Amount';
import ReportService from '../services/reportService';
import useCategories from '../hooks/useCategories';
import { useNotification } from '../context/NotificationContext';
import { PAYMENT_MODES } from '../utils/constants';
import { todayIso } from '../utils/format';
import { tokens } from '../theme/theme';

const REPORT_TYPES = [
  { value: 'daily', label: 'Day' },
  { value: 'monthly', label: 'Month' },
  { value: 'yearly', label: 'Year' },
  { value: 'range', label: 'Range' },
];

const currentYear = new Date().getFullYear();

export default function ReportsPage() {
  const { categories } = useCategories(true);
  const { notify, notifyError } = useNotification();

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
  const [loading, setLoading] = useState(false);

  const commonFilters = () => ({
    categoryId: categoryId || undefined,
    paymentMode: paymentMode || undefined,
    merchant: merchant || undefined,
  });

  const generate = async () => {
    setLoading(true);
    try {
      let data;
      if (reportType === 'daily') {
        data = await ReportService.daily({ date, ...commonFilters() });
      } else if (reportType === 'monthly') {
        data = await ReportService.monthly({ month, year, ...commonFilters() });
      } else if (reportType === 'yearly') {
        data = await ReportService.yearly({ year, ...commonFilters() });
      } else {
        data = await ReportService.range({ startDate, endDate, ...commonFilters() });
      }
      setReport(data);
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

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Break down spending by day, month, year, category, payment mode, or merchant."
        action={
          <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={exportAll}>
            Export entire database
          </Button>
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2.5}>
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
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
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
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Merchant contains"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" startIcon={<AssessmentRoundedIcon />} onClick={generate}>
                Generate report
              </Button>
              {report && (
                <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={exportCsv}>
                  Export this report
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {report && (
        <>
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={6} md={2.4}>
              <SummaryCard label="Total" value={report.totalExpenses} accent={tokens.color.ink} />
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
                  <Typography variant="h4" sx={{ fontFamily: tokens.font.mono, fontWeight: 600 }}>
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
                        <Bar dataKey="total" fill={tokens.color.credit} radius={[4, 4, 0, 0]} />
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
                      <Typography color="text.secondary">No expenses in this window.</Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
