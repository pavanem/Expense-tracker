import { useState } from 'react';
import { Box, Button, Card, LinearProgress } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PageHeader from '../components/common/PageHeader';
import CategoryList from '../components/categories/CategoryList';
import CategoryFormDialog from '../components/categories/CategoryFormDialog';
import useCategories from '../hooks/useCategories';

export default function CategoriesPage() {
  const { categories, loading, reload } = useCategories(false);
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
        title="Categories"
        subtitle="Organize expenses into categories you create and manage yourself."
        action={
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={handleAdd}>
            Add category
          </Button>
        }
      />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Card>
        <CategoryList categories={categories} onChanged={reload} onEdit={handleEdit} />
      </Card>

      <CategoryFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
        category={editingCategory}
      />
    </Box>
  );
}
