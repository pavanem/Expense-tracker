export const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'NET_BANKING', label: 'Net Banking' },
  { value: 'WALLET', label: 'Wallet' },
  { value: 'OTHER', label: 'Other' },
];

export const paymentModeLabel = (value) =>
  PAYMENT_MODES.find((m) => m.value === value)?.label || value;

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: 'dashboard' },
  { label: 'Expenses', path: '/expenses', icon: 'receipt' },
  { label: 'Income', path: '/income', icon: 'income' },
  { label: 'Categories', path: '/categories', icon: 'category' },
  { label: 'Income Categories', path: '/income-categories', icon: 'category' },
  { label: 'Reports', path: '/reports', icon: 'assessment' },
  { label: 'Users', path: '/admin/users', icon: 'group', adminOnly: true },
  { label: 'Settings', path: '/settings', icon: 'settings' },
];
