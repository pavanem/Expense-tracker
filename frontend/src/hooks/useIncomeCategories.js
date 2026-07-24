import { useCallback, useEffect, useState } from 'react';
import IncomeCategoryService from '../services/incomeCategoryService';
import { useNotification } from '../context/NotificationContext';

export default function useIncomeCategories(activeOnly = false) {
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notifyError } = useNotification();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await IncomeCategoryService.list(activeOnly);
      setIncomeCategories(data);
    } catch (err) {
      notifyError(err, 'Could not load income categories');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { incomeCategories, loading, reload };
}
