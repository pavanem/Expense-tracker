import { useState, useEffect, useCallback } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockResetIcon from '@mui/icons-material/LockReset';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import AdminService from '../services/adminService';

/* ---- helpers ---- */
function userInitials(username) {
  return username ? username.slice(0, 2).toUpperCase() : '??';
}

function avatarColor(username) {
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
  let hash = 0;
  for (const ch of username || '') hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---- sub-components ---- */
function RoleBadge({ role }) {
  return role === 'ADMIN' ? (
    <Chip
      icon={<AdminPanelSettingsIcon sx={{ fontSize: 14 }} />}
      label="Admin"
      size="small"
      color="primary"
      variant="outlined"
      sx={{ fontWeight: 700, fontSize: 11 }}
    />
  ) : (
    <Chip label="User" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: 11 }} />
  );
}

function StatusBadge({ enabled }) {
  return (
    <Chip
      label={enabled ? 'Active' : 'Disabled'}
      size="small"
      color={enabled ? 'success' : 'default'}
      sx={{ fontWeight: 600, fontSize: 11 }}
    />
  );
}

/* ============================================================
   Add User Dialog
   ============================================================ */
function AddUserDialog({ open, onClose, onCreated }) {
  const { notifyError } = useNotification();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [saving, setSaving] = useState(false);

  const reset = () => { setUsername(''); setPassword(''); setRole('USER'); };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 10) {
      notifyError({ friendlyMessage: 'Password must be at least 10 characters.' });
      return;
    }
    setSaving(true);
    try {
      const created = await AdminService.createUser({ username, password, role });
      onCreated(created);
      handleClose();
    } catch (err) {
      notifyError(err, 'Could not create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add new user</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              inputProps={{ pattern: '^[a-zA-Z0-9._-]+$', title: 'Letters, digits, dots, underscores, hyphens only' }}
              required
              autoFocus
              size="small"
              helperText="3–50 chars, letters / digits / . _ -"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              size="small"
              helperText="At least 10 characters"
              autoComplete="new-password"
            />
            <FormControl size="small">
              <InputLabel>Role</InputLabel>
              <Select value={role} label="Role" onChange={(e) => setRole(e.target.value)}>
                <MenuItem value="USER">User</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Create'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/* ============================================================
   Reset Password Dialog
   ============================================================ */
function ResetPasswordDialog({ user, onClose, onReset }) {
  const { notifyError } = useNotification();
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => { setNewPassword(''); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 10) {
      notifyError({ friendlyMessage: 'Password must be at least 10 characters.' });
      return;
    }
    setSaving(true);
    try {
      await AdminService.resetPassword(user.id, newPassword);
      onReset();
      handleClose();
    } catch (err) {
      notifyError(err, 'Could not reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Reset password</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Set a new password for <strong>{user?.username}</strong>. Their active sessions will be
            revoked and they will need to log in again.
          </DialogContentText>
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            size="small"
            fullWidth
            helperText="At least 10 characters"
            autoComplete="new-password"
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="contained" color="warning" disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Reset password'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

/* ============================================================
   Delete Confirm Dialog
   ============================================================ */
function DeleteDialog({ user, onClose, onDeleted }) {
  const { notifyError } = useNotification();
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    setSaving(true);
    try {
      await AdminService.deleteUser(user.id);
      onDeleted(user.id);
      onClose();
    } catch (err) {
      notifyError(err, 'Could not delete user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!user} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Delete user?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Permanently delete <strong>{user?.username}</strong>? Their expenses will remain in the
          database attributed to this account. This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ============================================================
   Main Page
   ============================================================ */
export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const { notify, notifyError } = useNotification();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await AdminService.listUsers());
    } catch (err) {
      notifyError(err, 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => { load(); }, [load]);

  const handleToggleEnabled = async (u) => {
    try {
      const updated = await AdminService.updateUser(u.id, { enabled: !u.enabled });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      notify(updated.enabled ? `${u.username} is now active.` : `${u.username} has been disabled.`);
    } catch (err) {
      notifyError(err, 'Could not update user');
    }
  };

  const handleRoleChange = async (u, newRole) => {
    try {
      const updated = await AdminService.updateUser(u.id, { role: newRole });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      notify(`${u.username} role updated to ${newRole.toLowerCase()}.`);
    } catch (err) {
      notifyError(err, 'Could not update role');
    }
  };

  const isSelf = (u) => u.id === currentUser?.userId;

  return (
    <Box>
      <PageHeader
        title="User Management"
        subtitle="Create accounts and manage access for all users on this instance."
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            id="add-user-btn"
          >
            Add user
          </Button>
        }
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 } }}>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last login</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow
                  key={u.id}
                  hover
                  sx={{ opacity: u.enabled ? 1 : 0.6, '&:last-child td': { borderBottom: 0 } }}
                >
                  {/* Avatar + username */}
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar
                        sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: avatarColor(u.username) }}
                      >
                        {userInitials(u.username)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {u.username}
                          {isSelf(u) && (
                            <Chip label="you" size="small" sx={{ ml: 1, fontSize: 10, height: 18 }} />
                          )}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>

                  {/* Role — inline change for non-self rows */}
                  <TableCell>
                    {isSelf(u) ? (
                      <RoleBadge role={u.role} />
                    ) : (
                      <Select
                        value={u.role}
                        size="small"
                        variant="standard"
                        disableUnderline
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        sx={{ fontSize: 13, fontWeight: 600 }}
                      >
                        <MenuItem value="USER">User</MenuItem>
                        <MenuItem value="ADMIN">Admin</MenuItem>
                      </Select>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell><StatusBadge enabled={u.enabled} /></TableCell>

                  {/* Dates */}
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{formatDate(u.lastLoginAt)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{formatDate(u.createdAt)}</Typography>
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {/* Enable / Disable */}
                      {!isSelf(u) && (
                        <Tooltip title={u.enabled ? 'Disable account' : 'Enable account'}>
                          <IconButton
                            size="small"
                            color={u.enabled ? 'default' : 'success'}
                            onClick={() => handleToggleEnabled(u)}
                          >
                            {u.enabled ? <PersonOffIcon fontSize="small" /> : <PersonIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Reset password */}
                      <Tooltip title="Reset password">
                        <IconButton size="small" onClick={() => setResetTarget(u)}>
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {/* Delete */}
                      {!isSelf(u) && (
                        <Tooltip title="Delete user">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(u)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}

              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No users found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialogs */}
      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(u) => {
          setUsers((prev) => [...prev, u]);
          notify(`User ${u.username} created successfully.`);
        }}
      />
      <ResetPasswordDialog
        user={resetTarget}
        onClose={() => setResetTarget(null)}
        onReset={() => notify(`Password reset for ${resetTarget?.username}. Their sessions have been revoked.`)}
      />
      <DeleteDialog
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={(id) => {
          setUsers((prev) => prev.filter((u) => u.id !== id));
          notify(`User deleted.`);
        }}
      />
    </Box>
  );
}
