import { useState } from 'react';
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CategoryChip from '../common/CategoryChip';
import CategoryService from '../../services/categoryService';
import { useNotification } from '../../context/NotificationContext';
import ConfirmDialog from '../common/ConfirmDialog';

export default function CategoryList({ categories, onChanged, onEdit }) {
  const { notify, notifyError } = useNotification();
  const [pendingDelete, setPendingDelete] = useState(null);

  const toggleStatus = async (category) => {
    try {
      if (category.status === 'ACTIVE') {
        await CategoryService.deactivate(category.id);
        notify(`${category.name} deactivated`);
      } else {
        await CategoryService.activate(category.id);
        notify(`${category.name} activated`);
      }
      onChanged();
    } catch (err) {
      notifyError(err, 'Could not update category status');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await CategoryService.remove(pendingDelete.id);
      notify(`${pendingDelete.name} deleted`);
      onChanged();
    } catch (err) {
      notifyError(err, 'Could not delete category');
    } finally {
      setPendingDelete(null);
    }
  };

  if (categories.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">No categories yet. Add your first one to get started.</Typography>
      </Box>
    );
  }

  return (
    <>
      <List disablePadding>
        {categories.map((category) => (
          <ListItem
            key={category.id}
            divider
            secondaryAction={
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Tooltip title={category.status === 'ACTIVE' ? 'Active — tap to deactivate' : 'Inactive — tap to activate'}>
                  <Switch
                    checked={category.status === 'ACTIVE'}
                    onChange={() => toggleStatus(category)}
                    size="small"
                  />
                </Tooltip>
                <IconButton edge="end" onClick={() => onEdit(category)} size="small">
                  <EditRoundedIcon fontSize="small" />
                </IconButton>
                <IconButton edge="end" onClick={() => setPendingDelete(category)} size="small">
                  <DeleteRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            }
            sx={{ py: 1.25, pr: 16 }}
          >
            <ListItemText
              primary={<CategoryChip name={category.name} color={category.color} />}
              secondary={`Display order ${category.displayOrder}`}
              secondaryTypographyProps={{ sx: { mt: 0.5 } }}
            />
          </ListItem>
        ))}
      </List>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete category?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" will be permanently removed. If any expenses use this category, deletion will be blocked — deactivate it instead.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="error"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
