import { Card, CardContent, Stack, Typography } from '@mui/material';
import Amount from './Amount';

/**
 * A single ledger-style stat tile (e.g. "Today", "This month"). Kept as
 * its own component since the dashboard, and potentially reports later,
 * both need the same "label over big mono amount" treatment.
 */
export default function SummaryCard({ label, value, accent, caption, masked = false }) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={0.75}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.06em' }}>
            {label}
          </Typography>
          <Amount value={value} size="h4" color={accent} masked={masked} />
          {caption && (
            <Typography variant="caption" color="text.secondary">
              {caption}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
