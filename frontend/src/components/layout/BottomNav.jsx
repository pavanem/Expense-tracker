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
      elevation={4}
      sx={{
        display: { xs: 'block', md: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        pb: 'env(safe-area-inset-bottom)',
        bgcolor: 'background.paper',
      }}
    >
      <BottomNavigation
        value={current}
        onChange={(_e, newValue) => navigate(newValue)}
        showLabels
        sx={{
          height: 60,
          display: 'flex',
          justifyContent: 'flex-start',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        {visibleItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.shortLabel || item.label}
            value={item.path}
            icon={<NavIcon name={item.icon} fontSize="small" />}
            sx={{
              minWidth: 70,
              flexShrink: 0,
              px: 0.75,
              py: 0.75,
              '& .MuiBottomNavigationAction-label': {
                fontSize: 10,
                whiteSpace: 'nowrap',
                mt: 0.25,
                lineHeight: 1.2,
                '&.Mui-selected': {
                  fontSize: 10,
                  fontWeight: 700,
                },
              },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
