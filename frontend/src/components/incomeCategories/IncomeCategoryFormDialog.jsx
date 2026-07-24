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
import IncomeCategoryService from '../../services/incomeCategoryService';
import { useNotification } from '../../context/NotificationContext';

const COLOR_PRESETS = [
  '#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#6b7280', '#06b6d4', '#ec4899', '#14b8a6',
];

const emptyForm = { name: '', icon: '', color: COLOR_PRESETS[0], displayOrder: 0, status: 'ACTIVE' };

export default function IncomeCategoryFormDialog({ open, onClose, onSaved, category }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { notify, notifyError } = useNotification();
  const isEdit = Boolean(category);

  useEffect(() => {
    if (open) {
      setForm(
        category
          ? {
              name: category.name,
              icon: category.icon || '',
              color: category.color,
              displayOrder: category.displayOrder,
              status: category.status,
            }
          : emptyForm
      );
      setErrors({});
    }
  }, [open, category]);

  const handleChange = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name?.trim()) next.name = 'Income category name is required';
    if (!form.color?.trim()) next.color = 'Pick a color';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, displayOrder: Number(form.displayOrder) || 0 };
      if (isEdit) {
        await IncomeCategoryService.update(category.id, payload);
        notify('Income category updated');
      } else {
        await IncomeCategoryService.create(payload);
        notify('Income category created');
      }
      onSaved();
      onClose();
    } catch (err) {
      notifyError(err, 'Could not save income category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? 'Edit income category' : 'New income category'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={handleChange('name')}
            error={Boolean(errors.name)}
            helperText={errors.name}
            autoFocus
            fullWidth
          />
          <TextField
            label="Icon (Material icon name, optional)"
            value={form.icon}
            onChange={handleChange('icon')}
            placeholder="e.g. work"
            fullWidth
          />
          <TextField
            select
            label="Color"
            value={form.color}
            onChange={handleChange('color')}
            error={Boolean(errors.color)}
            helperText={errors.color}
            fullWidth
          >
            {COLOR_PRESETS.map((c) => (
              <MenuItem key={c} value={c}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: c,
                      display: 'inline-block',
                    }}
                  />
                  <span>{c}</span>
                </Stack>
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Display order"
            type="number"
            value={form.displayOrder}
            onChange={handleChange('displayOrder')}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {isEdit ? 'Save changes' : 'Create category'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
