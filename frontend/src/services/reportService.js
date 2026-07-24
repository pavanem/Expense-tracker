import apiClient from './apiClient';

const ReportService = {
  daily: (params) => apiClient.get('/reports/daily', { params }).then((res) => res.data),

  monthly: (params) => apiClient.get('/reports/monthly', { params }).then((res) => res.data),

  yearly: (params) => apiClient.get('/reports/yearly', { params }).then((res) => res.data),

  range: (params) => apiClient.get('/reports/range', { params }).then((res) => res.data),

  incomeDaily: (params) => apiClient.get('/reports/income/daily', { params }).then((res) => res.data),

  incomeMonthly: (params) => apiClient.get('/reports/income/monthly', { params }).then((res) => res.data),

  incomeYearly: (params) => apiClient.get('/reports/income/yearly', { params }).then((res) => res.data),

  incomeRange: (params) => apiClient.get('/reports/income/range', { params }).then((res) => res.data),

  exportCsv: async (params) => {
    const response = await apiClient.get('/reports/export', {
      params,
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : 'expenses.csv';

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return filename;
  },
};

export default ReportService;
