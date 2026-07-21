import { createTheme } from '@mui/material/styles';

/**
 * Design tokens
 * ---------------------------------------------------------------------
 * Palette: a "ledger" concept — deep navy ink (#16213E) as the anchor,
 * an emerald "credit/growth" accent (#1F9E7A) used sparingly for positive
 * actions, and a warm amber (#E3A23A) reserved for the "quick add" moment
 * and highlights. Neutral paper background (#F4F5F7), not the generic
 * warm-cream AI default.
 *
 * Type: Outfit for headings (geometric, confident, a little architectural —
 * distinct from default Roboto), Inter for body/UI copy (highly legible at
 * small sizes on mobile), JetBrains Mono for all monetary figures — money
 * gets a fixed-width ledger treatment so amounts align like a real account
 * book, which doubles as this app's signature visual detail.
 */
export const tokens = {
  color: {
    ink: '#16213E',
    inkLight: '#28345C',
    credit: '#1F9E7A',
    amber: '#E3A23A',
    danger: '#D64545',
    paper: '#F4F5F7',
    surface: '#FFFFFF',
    textPrimary: '#1B1F27',
    textSecondary: '#5B6472',
    border: '#E3E6EB',
  },
  font: {
    display: '"Outfit", "Inter", sans-serif',
    body: '"Inter", "Roboto", sans-serif',
    mono: '"JetBrains Mono", "Roboto Mono", monospace',
  },
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: tokens.color.ink,
      light: tokens.color.inkLight,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: tokens.color.credit,
      contrastText: '#FFFFFF',
    },
    warning: {
      main: tokens.color.amber,
    },
    error: {
      main: tokens.color.danger,
    },
    background: {
      default: tokens.color.paper,
      paper: tokens.color.surface,
    },
    text: {
      primary: tokens.color.textPrimary,
      secondary: tokens.color.textSecondary,
    },
    divider: tokens.color.border,
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: tokens.font.body,
    h1: { fontFamily: tokens.font.display, fontWeight: 700 },
    h2: { fontFamily: tokens.font.display, fontWeight: 700 },
    h3: { fontFamily: tokens.font.display, fontWeight: 600 },
    h4: { fontFamily: tokens.font.display, fontWeight: 600 },
    h5: { fontFamily: tokens.font.display, fontWeight: 600 },
    h6: { fontFamily: tokens.font.display, fontWeight: 600 },
    button: { fontFamily: tokens.font.body, fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 16 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: 'none', borderBottom: `1px solid ${tokens.color.border}` },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: `1px solid ${tokens.color.border}`,
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontFamily: tokens.font.display,
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: tokens.color.textSecondary,
          backgroundColor: tokens.color.paper,
        },
      },
    },
  },
});

export default theme;
