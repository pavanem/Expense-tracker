import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../components/common/PageHeader';
import SummaryCard from '../components/common/SummaryCard';
import Amount from '../components/common/Amount';
import CategoryChip from '../components/common/CategoryChip';
import DashboardService from '../services/dashboardService';
import ReportService from '../services/reportService';
import { useNotification } from '../context/NotificationContext';
import { formatDate } from '../utils/format';
import { paymentModeLabel } from '../utils/constants';
import ExpenseFormDialog from '../components/expenses/ExpenseFormDialog';
import IncomeFormDialog from '../components/income/IncomeFormDialog';
import CategoryFormDialog from '../components/categories/CategoryFormDialog';
import useCategories from '../hooks/useCategories';
import useIncomeCategories from '../hooks/useIncomeCategories';
import { tokens } from '../theme/theme';

const HIDE_AMOUNTS_KEY = 'dashboard:hideAmounts';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(
    () => localStorage.getItem(HIDE_AMOUNTS_KEY) === 'true'
  );
  const { notifyError, notify } = useNotification();
  const { categories, reload: reloadCategories } = useCategories(true);
  const { incomeCategories } = useIncomeCategories(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await DashboardService.get();
      setData(result);
    } catch (err) {
      notifyError(err, 'Could not load dashboard');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleHideAmounts = () => {
    setHideAmounts((prev) => {
      const next = !prev;
      localStorage.setItem(HIDE_AMOUNTS_KEY, String(next));
      return next;
    });
  };

  const handleExportAll = async () => {
    try {
      const filename = await ReportService.exportCsv({});
      notify(`Downloaded ${filename}`);
    } catch (err) {
      notifyError(err, 'Could not export CSV');
    }
  };

  if (loading && !data) {
    return <LinearProgress />;
  }

  const maxCategoryTotal = Math.max(
    1,
    ...(data?.topSpendingCategories || []).map((c) => Number(c.total))
  );

  // Combine monthly expense and income summaries for the chart
  const monthsMap = new Map();
  (data?.monthlyExpenseSummary || []).forEach((item) => {
    monthsMap.set(item.month, { month: item.month, expenses: Number(item.total), income: 0 });
  });
  (data?.monthlyIncomeSummary || []).forEach((item) => {
    const existing = monthsMap.get(item.month) || { month: item.month, expenses: 0, income: 0 };
    existing.income = Number(item.total);
    monthsMap.set(item.month, existing);
  });
  const chartData = Array.from(monthsMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Your financial picture, expenses, and income at a glance."
        action={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={1}>
            <Tooltip title={hideAmounts ? 'Show amounts' : 'Hide amounts'}>
              <IconButton onClick={toggleHideAmounts} sx={{ border: '1px solid', borderColor: 'divider' }}>
                {hideAmounts ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<CategoryRoundedIcon />}
              onClick={() => setCategoryDialogOpen(true)}
            >
              Add category
            </Button>
            <Button variant="outlined" startIcon={<FileDownloadRoundedIcon />} onClick={handleExportAll}>
              Export CSV
            </Button>
            <Button
              variant="outlined"
              color="success"
              startIcon={<TrendingUpRoundedIcon />}
              onClick={() => setIncomeDialogOpen(true)}
            >
              Add income
            </Button>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => setExpenseDialogOpen(true)}
            >
              Add expense
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <SummaryCard label="Today expense" value={data?.todayTotal} accent={tokens.color.amber} masked={hideAmounts} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <SummaryCard label="Month expense" value={data?.currentMonthTotal} accent={tokens.color.ink} masked={hideAmounts} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <SummaryCard label="Month income" value={data?.currentMonthIncome} accent="#10b981" masked={hideAmounts} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <SummaryCard label="Net savings" value={data?.currentMonthNet} accent={data?.currentMonthNet >= 0 ? '#10b981' : tokens.color.amber} masked={hideAmounts} />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <SummaryCard label="This year expense" value={data?.currentYearTotal} accent={tokens.color.credit} masked={hideAmounts} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Recent expenses
              </Typography>
              {(data?.recentExpenses || []).length === 0 && (
                <Typography color="text.secondary">No expenses yet. Add your first one above.</Typography>
              )}
              <Stack spacing={1.5}>
                {(data?.recentExpenses || []).map((expense) => (
                  <Stack
                    key={expense.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ pb: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}
                  >
                    <Stack spacing={0.4}>
                      <CategoryChip name={expense.category?.name} color={expense.category?.color} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(expense.expenseDate)} · {paymentModeLabel(expense.paymentMode)}
                        {expense.merchant ? ` · ${expense.merchant}` : ''}
                      </Typography>
                    </Stack>
                    <Amount value={expense.amount} size="body1" masked={false} />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Top spending categories
              </Typography>
              {(data?.topSpendingCategories || []).length === 0 && (
                <Typography color="text.secondary">Nothing to show yet this month.</Typography>
              )}
              <Stack spacing={2}>
                {(data?.topSpendingCategories || []).map((cat) => (
                  <Box key={cat.categoryId}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <CategoryChip name={cat.categoryName} color={cat.categoryColor} />
                      <Amount value={cat.total} size="body2" masked={hideAmounts} />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={hideAmounts ? 0 : (Number(cat.total) / maxCategoryTotal) * 100}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: `${cat.categoryColor}22`,
                        '& .MuiLinearProgress-bar': { bgcolor: cat.categoryColor },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2.5 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Income vs Expenses (Last 6 months)
              </Typography>
              {hideAmounts ? (
                <Box
                  sx={{
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  <Stack spacing={1} alignItems="center">
                    <VisibilityOffRoundedIcon fontSize="small" />
                    <Typography variant="caption">Amounts hidden</Typography>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={tokens.color.border} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={40} />
                      <RechartsTooltip formatter={(value, name) => [`₹${value}`, name === 'income' ? 'Income' : 'Expenses']} />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill={tokens.color.credit} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ExpenseFormDialog
        open={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
        onSaved={load}
        expense={null}
        categories={categories}
      />
      <IncomeFormDialog
        open={incomeDialogOpen}
        onClose={() => setIncomeDialogOpen(false)}
        onSaved={load}
        income={null}
        incomeCategories={incomeCategories}
      />
      <CategoryFormDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        onSaved={() => {
          reloadCategories();
          load();
        }}
        category={null}
      />
    </Box>
  );
}
