import { useState } from 'react';
import { Box, Button, Card, LinearProgress } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PageHeader from '../components/common/PageHeader';
import IncomeCategoryList from '../components/incomeCategories/IncomeCategoryList';
import IncomeCategoryFormDialog from '../components/incomeCategories/IncomeCategoryFormDialog';
import useIncomeCategories from '../hooks/useIncomeCategories';

export default function IncomeCategoriesPage() {
  const { incomeCategories, loading, reload } = useIncomeCategories(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const handleAdd = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  return (
    <Box>
      <PageHeader
        title="Income Categories"
        subtitle="Manage the categories used for categorizing your income sources."
        action={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={handleAdd}>
            Add category
          </Button>
        }
      />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card>
        <IncomeCategoryList categories={incomeCategories} onChanged={reload} onEdit={handleEdit} />
      </Card>

      <IncomeCategoryFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        category={editingCategory}
      />
    </Box>
  );
}
