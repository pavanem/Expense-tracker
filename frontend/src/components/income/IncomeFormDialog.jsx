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
import IncomeService from '../../services/incomeService';
import { useNotification } from '../../context/NotificationContext';
import { toIsoDate, todayIso } from '../../utils/format';
import { addMonths, parseISO } from 'date-fns';

const emptyForm = {
  amount: '',
  incomeCategoryId: '',
  source: '',
  description: '',
  incomeDate: todayIso(),
};

export default function IncomeFormDialog({ open, onClose, onSaved, income, incomeCategories }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { notify, notifyError } = useNotification();
  const isEdit = Boolean(income);

  const maxAllowedDate = addMonths(new Date(), 2);

  useEffect(() => {
    if (open) {
      setForm(
        income
          ? {
              amount: income.amount,
              incomeCategoryId: income.incomeCategory?.id ?? '',
              source: income.source || '',
              description: income.description || '',
              incomeDate: income.incomeDate,
            }
          : emptyForm
      );
      setErrors({});
    }
  }, [open, income]);

  const handleChange = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const validate = () => {
    const next = {};
    const amountNum = Number(form.amount);
    if (!form.amount || Number.isNaN(amountNum) || amountNum <= 0) {
      next.amount = 'Amount must be greater than zero';
    }
    if (!form.incomeCategoryId) next.incomeCategoryId = 'Category is required';
    if (!form.incomeDate) next.incomeDate = 'Income date is required';
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
        incomeCategoryId: Number(form.incomeCategoryId),
        source: form.source || null,
        description: form.description || null,
        incomeDate: form.incomeDate,
      };
      if (isEdit) {
        await IncomeService.update(income.id, payload);
        notify('Income updated');
      } else {
        await IncomeService.create(payload);
        notify('Income added');
      }
      onSaved();
      onClose();
    } catch (err) {
      notifyError(err, 'Could not save income');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? 'Edit income' : 'Add income'}</DialogTitle>
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
            value={form.incomeCategoryId}
            onChange={handleChange('incomeCategoryId')}
            error={Boolean(errors.incomeCategoryId)}
            helperText={errors.incomeCategoryId}
            fullWidth
          >
            {incomeCategories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <DatePicker
            label="Income date"
            value={form.incomeDate ? parseISO(form.incomeDate) : null}
            onChange={(date) => setForm((prev) => ({ ...prev, incomeDate: toIsoDate(date) }))}
            maxDate={maxAllowedDate}
            slotProps={{
              textField: { fullWidth: true, error: Boolean(errors.incomeDate), helperText: errors.incomeDate },
            }}
          />
          <TextField
            label="Source / Payer (optional)"
            placeholder="e.g. Google Payroll, Client ABC"
            value={form.source}
            onChange={handleChange('source')}
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
          {isEdit ? 'Save changes' : 'Add income'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
