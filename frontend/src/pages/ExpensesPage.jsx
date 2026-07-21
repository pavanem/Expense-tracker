import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PageHeader from '../components/common/PageHeader';
import ExpenseFilters from '../components/expenses/ExpenseFilters';
import ExpenseTable from '../components/expenses/ExpenseTable';
import ExpenseFormDialog from '../components/expenses/ExpenseFormDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';
import CategoryChip from '../components/common/CategoryChip';
import Amount from '../components/common/Amount';
import ExpenseService from '../services/expenseService';
import useCategories from '../hooks/useCategories';
import useDebounce from '../hooks/useDebounce';
import { useNotification } from '../context/NotificationContext';
import { formatDate } from '../utils/format';
import { paymentModeLabel } from '../utils/constants';

const emptyFilters = {
  keyword: '',
  categoryId: '',
  paymentMode: '',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: '',
};

export default function ExpensesPage() {
  const { categories } = useCategories(true);
  const { notify, notifyError } = useNotification();

  const [filters, setFilters] = useState(emptyFilters);
  const debouncedKeyword = useDebounce(filters.keyword, 350);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [sortBy, setSortBy] = useState('expenseDate');
  const [sortDir, setSortDir] = useState('DESC');

  const [result, setResult] = useState({ content: [], totalElements: 0 });
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const activeFilterCount = useMemo(
    () =>
      ['categoryId', 'paymentMode', 'startDate', 'endDate', 'minAmount', 'maxAmount'].filter(
        (key) => filters[key] !== '' && filters[key] !== undefined
      ).length,
    [filters]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (debouncedKeyword.trim()) {
        data = await ExpenseService.search(debouncedKeyword.trim(), { page, size, sortBy, sortDir });
      } else {
        data = await ExpenseService.list({
          categoryId: filters.categoryId || undefined,
          paymentMode: filters.paymentMode || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          minAmount: filters.minAmount || undefined,
          maxAmount: filters.maxAmount || undefined,
          page,
          size,
          sortBy,
          sortDir,
        });
      }
      setResult(data);
    } catch (err) {
      notifyError(err, 'Could not load expenses');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedKeyword,
    filters.categoryId,
    filters.paymentMode,
    filters.startDate,
    filters.endDate,
    filters.minAmount,
    filters.maxAmount,
    page,
    size,
    sortBy,
    sortDir,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFiltersChange = (next) => {
    setFilters(next);
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
    setPage(0);
  };

  const handleSortChange = (key, dir) => {
    setSortBy(key);
    setSortDir(dir);
  };

  const handleAdd = () => {
    setEditingExpense(null);
    setFormOpen(true);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await ExpenseService.remove(pendingDelete.id);
      notify('Expense deleted');
      load();
    } catch (err) {
      notifyError(err, 'Could not delete expense');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Expenses"
        subtitle="Search, filter, sort, and manage every transaction."
        action={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={handleAdd}>
            Add expense
          </Button>
        }
      />

      <ExpenseFilters
        categories={categories}
        filters={filters}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
        activeCount={activeFilterCount}
      />

      <ExpenseTable
        expenses={result.content || []}
        page={page}
        size={size}
        totalElements={result.totalElements || 0}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        onPageChange={setPage}
        onSizeChange={(newSize) => {
          setSize(newSize);
          setPage(0);
        }}
        onView={setViewingExpense}
        onEdit={handleEdit}
        onDelete={setPendingDelete}
      />
      {loading && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Loading…
        </Typography>
      )}

      <ExpenseFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        expense={editingExpense}
        categories={categories}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete expense?"
        message={pendingDelete ? `This expense of ₹${pendingDelete.amount} will be permanently deleted.` : ''}
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <Dialog open={Boolean(viewingExpense)} onClose={() => setViewingExpense(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Expense details</DialogTitle>
        <DialogContent>
          {viewingExpense && (
            <Stack spacing={1.5} sx={{ pb: 1 }}>
              <Amount value={viewingExpense.amount} size="h5" />
              <CategoryChip name={viewingExpense.category?.name} color={viewingExpense.category?.color} />
              <Typography variant="body2">Date: {formatDate(viewingExpense.expenseDate)}</Typography>
              <Typography variant="body2">Payment mode: {paymentModeLabel(viewingExpense.paymentMode)}</Typography>
              <Typography variant="body2">Merchant: {viewingExpense.merchant || '—'}</Typography>
              <Typography variant="body2">Notes: {viewingExpense.description || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">
                Added {formatDate(viewingExpense.createdAt, 'dd MMM yyyy, HH:mm')}
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
