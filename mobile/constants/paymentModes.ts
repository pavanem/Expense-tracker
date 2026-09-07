export const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'NET_BANKING', label: 'Net Banking' },
  { value: 'WALLET', label: 'Wallet' },
  { value: 'OTHER', label: 'Other' },
];

export const getPaymentModeLabel = (value: string) =>
  PAYMENT_MODES.find((m) => m.value === value)?.label || value;
