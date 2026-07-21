import { useCallback, useEffect, useState } from 'react';
import CategoryService from '../services/categoryService';
import { useNotification } from '../context/NotificationContext';

export default function useCategories(activeOnly = false) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notifyError } = useNotification();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await CategoryService.list(activeOnly);
      setCategories(data);
    } catch (err) {
      notifyError(err, 'Could not load categories');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { categories, loading, reload };
}
