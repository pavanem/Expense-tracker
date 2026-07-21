import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import ExpenseService from '../../services/expenseService';
import { useNotification } from '../../context/NotificationContext';
import { PAYMENT_MODES } from '../../utils/constants';
import { toIsoDate, todayIso } from '../../utils/format';
import { parseISO } from 'date-fns';

const emptyForm = {
  amount: '',
  categoryId: '',
  merchant: '',
  description: '',
  paymentMode: 'UPI',
  expenseDate: todayIso(),
};

export default function ExpenseFormDialog({ open, onClose, onSaved, expense, categories }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { notify, notifyError } = useNotification();
  const isEdit = Boolean(expense);

  useEffect(() => {
    if (open) {
      setForm(
        expense
          ? {
              amount: expense.amount,
              categoryId: expense.category?.id ?? '',
              merchant: expense.merchant || '',
              description: expense.description || '',
              paymentMode: expense.paymentMode,
              expenseDate: expense.expenseDate,
            }
          : emptyForm
      );
      setErrors({});
    }
  }, [open, expense]);

  const handleChange = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const validate = () => {
    const next = {};
    const amountNum = Number(form.amount);
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      next.amount = 'Amount must be greater than zero';
    }
    if (!form.categoryId) next.categoryId = 'Category is required';
    if (!form.paymentMode) next.paymentMode = 'Payment mode is required';
    if (!form.expenseDate) next.expenseDate = 'Expense date is required';
    if (form.description && form.description.length > 500) {
      next.description = 'Description must not exceed 500 characters';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        amount: Number(form.amount),
        categoryId: Number(form.categoryId),
        merchant: form.merchant || null,
        description: form.description || null,
        paymentMode: form.paymentMode,
        expenseDate: form.expenseDate,
      };
      if (isEdit) {
        await ExpenseService.update(expense.id, payload);
        notify('Expense updated');
      } else {
        await ExpenseService.create(payload);
        notify('Expense added');
      }
      onSaved();
      onClose();
    } catch (err) {
      notifyError(err, 'Could not save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? 'Edit expense' : 'Add expense'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Amount"
            type="number"
            inputProps={{ step: '0.01', min: '0.01' }}
            value={form.amount}
            onChange={handleChange('amount')}
            error={Boolean(errors.amount)}
            helperText={errors.amount}
            autoFocus
            fullWidth
          />
          <TextField
            select
            label="Category"
            value={form.categoryId}
            onChange={handleChange('categoryId')}
            error={Boolean(errors.categoryId)}
            helperText={errors.categoryId}
            fullWidth
          >
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Payment mode"
            value={form.paymentMode}
            onChange={handleChange('paymentMode')}
            error={Boolean(errors.paymentMode)}
            helperText={errors.paymentMode}
            fullWidth
          >
            {PAYMENT_MODES.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                {m.label}
              </MenuItem>
            ))}
          </TextField>
          <DatePicker
            label="Expense date"
            value={form.expenseDate ? parseISO(form.expenseDate) : null}
            onChange={(date) => setForm((prev) => ({ ...prev, expenseDate: toIsoDate(date) }))}
            maxDate={new Date()}
            slotProps={{
              textField: { fullWidth: true, error: Boolean(errors.expenseDate), helperText: errors.expenseDate },
            }}
          />
          <TextField
            label="Merchant (optional)"
            value={form.merchant}
            onChange={handleChange('merchant')}
            fullWidth
          />
          <TextField
            label="Description / notes (optional)"
            value={form.description}
            onChange={handleChange('description')}
            error={Boolean(errors.description)}
            helperText={errors.description || `${form.description.length}/500`}
            multiline
            minRows={2}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {isEdit ? 'Save changes' : 'Add expense'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
