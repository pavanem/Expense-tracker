import { Typography } from '@mui/material';
import { tokens } from '../../theme/theme';

const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

/**
 * Renders a monetary value in the app's signature ledger typeface
 * (tabular-nums monospace) so amounts always align in columns, the way
 * they would in a physical account book.
 */
export default function Amount({ value, size = 'body1', color, weight = 600, sx = {}, masked = false }) {
  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  return (
    <Typography
      component="span"
      variant={size}
      sx={{
        fontFamily: tokens.font.mono,
        fontWeight: weight,
        fontVariantNumeric: 'tabular-nums',
        color: color || 'inherit',
        userSelect: masked ? 'none' : 'auto',
        ...sx,
      }}
    >
      {masked ? '••••••' : formatter.format(numeric)}
    </Typography>
  );
}
