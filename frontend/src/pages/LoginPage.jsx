import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthService from '../services/authService';
import { tokens } from '../theme/theme';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [checkingMode, setCheckingMode] = useState(true);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    AuthService.registrationStatus()
      .then((open) => setIsRegisterMode(open))
      .catch(() => setIsRegisterMode(false))
      .finally(() => setCheckingMode(false));
  }, []);

  const redirectAfterAuth = () => {
    const destination = location.state?.from?.pathname || '/';
    navigate(destination, { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isRegisterMode && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegisterMode) {
        await register(username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
      redirectAfterAuth();
    } catch (err) {
      setError(err?.friendlyMessage || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingMode) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={0.5} sx={{ mb: 3 }}>
            <Typography sx={{ fontFamily: tokens.font.mono, fontWeight: 700, fontSize: 22, color: tokens.color.ink }}>
              Ledger
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isRegisterMode
                ? 'Create the account for this instance — this is a one-time setup.'
                : 'Sign in to your expense tracker.'}
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                required
                fullWidth
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                required
                fullWidth
                helperText={isRegisterMode ? 'At least 10 characters.' : ' '}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRoundedIcon fontSize="small" color="disabled" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" size="small">
                        {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              {isRegisterMode && (
                <TextField
                  label="Confirm password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  fullWidth
                />
              )}

              <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ mt: 1 }}>
                {submitting ? 'Please wait…' : isRegisterMode ? 'Create account' : 'Sign in'}
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                You'll stay signed in on this device for about a month.
              </Typography>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
