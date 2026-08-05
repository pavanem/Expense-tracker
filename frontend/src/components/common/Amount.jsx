import { Typography, useMediaQuery, useTheme } from '@mui/material';
import { tokens } from '../../theme/theme';

const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Maps heading variants down one step on mobile so amounts don't
 * overflow their cards on small screens.
 */
const MOBILE_SIZE_MAP = {
  h3: 'h5',
  h4: 'h6',
  h5: 'body1',
  h6: 'body1',
};

/**
 * Renders a monetary value in the app's signature ledger typeface
 * (tabular-nums monospace) so amounts always align in columns, the way
 * they would in a physical account book. On mobile, heading variants are
 * scaled down and decimals are dropped to prevent overflow.
 */
export default function Amount({ value, size = 'body1', color, weight = 600, sx = {}, masked = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const numeric = typeof value === 'number' ? value : Number(value ?? 0);
  const displayVariant = isMobile ? (MOBILE_SIZE_MAP[size] || size) : size;
  const displayValue = isMobile ? compactFormatter.format(numeric) : formatter.format(numeric);

  return (
    <Typography
      component="span"
      variant={displayVariant}
      sx={{
        fontFamily: tokens.font.mono,
        fontWeight: weight,
        fontVariantNumeric: 'tabular-nums',
        color: color || 'inherit',
        userSelect: masked ? 'none' : 'auto',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        ...sx,
      }}
    >
      {masked ? '••••••' : displayValue}
    </Typography>
  );
}
