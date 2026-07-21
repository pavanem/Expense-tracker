import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { PAYMENT_MODES } from '../../utils/constants';

export default function ExpenseFilters({ categories, filters, onChange, onClear, activeCount }) {
  const [expanded, setExpanded] = useState(false);

  const set = (field) => (event) => onChange({ ...filters, [field]: event.target.value });

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <TextField
        placeholder="Search by category, merchant, description, amount, date, or payment mode"
        value={filters.keyword}
        onChange={set('keyword')}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <Accordion
        expanded={expanded}
        onChange={(_e, isExp) => setExpanded(isExp)}
        disableGutters
        sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TuneRoundedIcon fontSize="small" />
            <span>Filters</span>
            {activeCount > 0 && <Chip size="small" label={activeCount} color="secondary" />}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                label="Category"
                value={filters.categoryId}
                onChange={set('categoryId')}
                fullWidth
                size="small"
              >
                <MenuItem value="">All categories</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                label="Payment mode"
                value={filters.paymentMode}
                onChange={set('paymentMode')}
                fullWidth
                size="small"
              >
                <MenuItem value="">All modes</MenuItem>
                {PAYMENT_MODES.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="From"
                type="date"
                value={filters.startDate}
                onChange={set('startDate')}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="To"
                type="date"
                value={filters.endDate}
                onChange={set('endDate')}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Min amount"
                type="number"
                value={filters.minAmount}
                onChange={set('minAmount')}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Max amount"
                type="number"
                value={filters.maxAmount}
                onChange={set('maxAmount')}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Chip label="Clear filters" onClick={onClear} variant="outlined" />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
