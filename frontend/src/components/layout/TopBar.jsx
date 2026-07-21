import { AppBar, Toolbar, Typography, IconButton, Tooltip } from '@mui/material';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { NAV_ITEMS } from '../../utils/constants';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const title = NAV_ITEMS.find((item) => item.path === location.pathname)?.label || 'Ledger';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{ display: { xs: 'flex', md: 'none' }, bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Tooltip title="Log out">
          <IconButton onClick={handleLogout} size="small">
            <LogoutRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
