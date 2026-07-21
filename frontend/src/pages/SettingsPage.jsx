import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../context/AuthContext';
import AuthService from '../services/authService';
import { useNotification } from '../context/NotificationContext';

const UPCOMING = [
  'Multi-user support',
  'Budget planning',
  'Receipt image upload + OCR',
  'AI expense categorization',
  'Scheduled email reports',
  'Offline-capable PWA mode',
  'Expense charts & deeper analytics',
  'Cloud backup',
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logoutAllDevices } = useAuth();
  const { notify, notifyError } = useNotification();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      notifyError({ friendlyMessage: 'New passwords do not match.' });
      return;
    }
    setChangingPassword(true);
    try {
      await AuthService.changePassword(currentPassword, newPassword);
      notify('Password changed. Please sign in again.');
      await logoutAllDevices();
      navigate('/login', { replace: true });
    } catch (err) {
      notifyError(err, 'Could not change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutEverywhere = async () => {
    try {
      await logoutAllDevices();
      notify('Logged out on every device.');
      navigate('/login', { replace: true });
    } catch (err) {
      notifyError(err, 'Could not log out everywhere');
    }
  };

  return (
    <Box>
      <PageHeader title="Settings" subtitle="App info and preferences for this self-hosted instance." />

      <Stack spacing={2.5}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              Account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Signed in as <strong>{user?.username}</strong>. Sessions stay signed in on a device for about a
              month unless you log out.
            </Typography>

            <Box component="form" onSubmit={handleChangePassword} sx={{ mb: 2.5 }}>
              <Stack spacing={1.5} sx={{ maxWidth: 360 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Change password
                </Typography>
                <TextField
                  label="Current password"
                  type="password"
                  size="small"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <TextField
                  label="New password"
                  type="password"
                  size="small"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  helperText="At least 10 characters."
                  required
                />
                <TextField
                  label="Confirm new password"
                  type="password"
                  size="small"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <Button type="submit" variant="contained" disabled={changingPassword} sx={{ alignSelf: 'flex-start' }}>
                  {changingPassword ? 'Updating…' : 'Update password'}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
              <Typography variant="body2" color="text.secondary">
                Signed in somewhere you don't recognize? Revoke every active session at once.
              </Typography>
              <Button variant="outlined" color="error" onClick={handleLogoutEverywhere}>
                Log out everywhere
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              Appearance
            </Typography>
            <FormControlLabel control={<Switch disabled />} label="Dark mode (coming soon)" />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              Categories
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Manage the categories used across expenses, including activating or deactivating ones you no
              longer use.
            </Typography>
            <Chip label="Manage categories" onClick={() => navigate('/categories')} clickable color="primary" variant="outlined" />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              About this instance
            </Typography>
            <Stack spacing={0.75}>
              <Typography variant="body2" color="text.secondary">
                Expense Tracker v1.0.0 — self-hosted, no cloud dependency.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              On the roadmap
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {UPCOMING.map((item) => (
                <Chip key={item} label={item} size="small" variant="outlined" />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
