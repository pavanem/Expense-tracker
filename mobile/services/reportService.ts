import { getApiClient } from './apiClient';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const ReportService = {
  daily: (params?: object) => getApiClient().get('/reports/daily', { params }).then((res) => res.data),
  monthly: (params?: object) => getApiClient().get('/reports/monthly', { params }).then((res) => res.data),
  yearly: (params?: object) => getApiClient().get('/reports/yearly', { params }).then((res) => res.data),
  range: (params?: object) => getApiClient().get('/reports/range', { params }).then((res) => res.data),
  incomeDaily: (params?: object) => getApiClient().get('/reports/income/daily', { params }).then((res) => res.data),
  incomeMonthly: (params?: object) => getApiClient().get('/reports/income/monthly', { params }).then((res) => res.data),
  incomeYearly: (params?: object) => getApiClient().get('/reports/income/yearly', { params }).then((res) => res.data),
  incomeRange: (params?: object) => getApiClient().get('/reports/income/range', { params }).then((res) => res.data),

  /**
   * Mobile export: downloads the CSV blob, saves it to the device's cache
   * directory, then opens the native share sheet (WhatsApp, Files, email…).
   */
  exportCsv: async (params?: object): Promise<void> => {
    const response = await getApiClient().get('/reports/export', {
      params,
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : 'expenses.csv';

    // Convert Blob to base64 string for FileSystem
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]); // strip "data:text/csv;base64,"
      };
      reader.onerror = reject;
      reader.readAsDataURL(response.data);
    });
    const base64 = await base64Promise;

    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
    }
  },
};

export default ReportService;
