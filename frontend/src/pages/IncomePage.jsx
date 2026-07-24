import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PageHeader from '../components/common/PageHeader';
import IncomeFilters from '../components/income/IncomeFilters';
import IncomeTable from '../components/income/IncomeTable';
import IncomeFormDialog from '../components/income/IncomeFormDialog';
import ConfirmDialog from '../components/common/ConfirmDialog';
import CategoryChip from '../components/common/CategoryChip';
import Amount from '../components/common/Amount';
import IncomeService from '../services/incomeService';
import useIncomeCategories from '../hooks/useIncomeCategories';
import useDebounce from '../hooks/useDebounce';
import { useNotification } from '../context/NotificationContext';
import { formatDate } from '../utils/format';

const emptyFilters = {
  keyword: '',
  incomeCategoryId: '',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: '',
};

export default function IncomePage() {
  const { incomeCategories } = useIncomeCategories(true);
  const { notify, notifyError } = useNotification();

  const [filters, setFilters] = useState(emptyFilters);
  const debouncedKeyword = useDebounce(filters.keyword, 350);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [sortBy, setSortBy] = useState('incomeDate');
  const [sortDir, setSortDir] = useState('DESC');

  const [result, setResult] = useState({ content: [], totalElements: 0 });
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [viewingIncome, setViewingIncome] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const activeFilterCount = useMemo(
    () =>
      ['incomeCategoryId', 'startDate', 'endDate', 'minAmount', 'maxAmount'].filter(
        (key) => filters[key] !== '' && filters[key] !== undefined
      ).length,
    [filters]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (debouncedKeyword.trim()) {
        data = await IncomeService.search(debouncedKeyword.trim(), { page, size, sortBy, sortDir });
      } else {
        data = await IncomeService.list({
          incomeCategoryId: filters.incomeCategoryId || undefined,
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
      notifyError(err, 'Could not load income records');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedKeyword,
    filters.incomeCategoryId,
    filters.startDate,
    filters.endDate,
    filters.minAmount,
    filters.maxAmount,
    page,
    size,
    sortBy,
    sortDir,
    notifyError,
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
    setEditingIncome(null);
    setFormOpen(true);
  };

  const handleEdit = (income) => {
    setEditingIncome(income);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await IncomeService.remove(pendingDelete.id);
      notify('Income record deleted');
      load();
    } catch (err) {
      notifyError(err, 'Could not delete income record');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Income"
        subtitle="Track, filter, and manage all your income sources."
        action={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={handleAdd}>
            Add income
          </Button>
        }
      />

      <IncomeFilters
        incomeCategories={incomeCategories}
        filters={filters}
        onChange={handleFiltersChange}
        onClear={handleClearFilters}
        activeCount={activeFilterCount}
      />

      <IncomeTable
        incomes={result.content || []}
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
        onView={setViewingIncome}
        onEdit={handleEdit}
        onDelete={setPendingDelete}
      />
      {loading && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Loading…
        </Typography>
      )}

      <IncomeFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        income={editingIncome}
        incomeCategories={incomeCategories}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete income record?"
        message={pendingDelete ? `This income of ₹${pendingDelete.amount} will be permanently deleted.` : ''}
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <Dialog open={Boolean(viewingIncome)} onClose={() => setViewingIncome(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Income details</DialogTitle>
        <DialogContent>
          {viewingIncome && (
            <Stack spacing={1.5} sx={{ pb: 1 }}>
              <Amount value={viewingIncome.amount} size="h5" />
              <CategoryChip name={viewingIncome.incomeCategory?.name} color={viewingIncome.incomeCategory?.color} />
              <Typography variant="body2">Date: {formatDate(viewingIncome.incomeDate)}</Typography>
              <Typography variant="body2">Source: {viewingIncome.source || '—'}</Typography>
              <Typography variant="body2">Notes: {viewingIncome.description || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">
                Added {formatDate(viewingIncome.createdAt, 'dd MMM yyyy, HH:mm')}
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
