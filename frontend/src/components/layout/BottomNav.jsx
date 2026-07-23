import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import NavIcon from './NavIcon';
import { NAV_ITEMS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'ADMIN');
  const current = visibleItems.find((item) => item.path === location.pathname)?.path || false;

  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation
        value={current}
        onChange={(_e, newValue) => navigate(newValue)}
        showLabels
        sx={{ height: 64 }}
      >
        {visibleItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            value={item.path}
            icon={<NavIcon name={item.icon} fontSize="small" />}
            sx={{ minWidth: 0, fontSize: 11 }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
