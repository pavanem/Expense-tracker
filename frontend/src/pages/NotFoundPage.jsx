import { Box, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../theme/theme';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: { xs: 6, md: 10 } }}>
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography
          sx={{ fontFamily: tokens.font.mono, fontSize: { xs: 56, md: 72 }, fontWeight: 700, color: tokens.color.ink }}
        >
          404
        </Typography>
        <Typography variant="h6">This page isn't in the ledger.</Typography>
        <Typography variant="body2" color="text.secondary">
          The page you're looking for doesn't exist or may have moved.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </Stack>
    </Box>
  );
}
