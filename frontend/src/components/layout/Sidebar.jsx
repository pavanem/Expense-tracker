import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, IconButton, Tooltip } from '@mui/material';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import NavIcon from './NavIcon';
import { NAV_ITEMS } from '../../utils/constants';
import { tokens } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

const DRAWER_WIDTH = 232;

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: tokens.color.ink,
          color: '#FFFFFF',
          border: 'none',
        },
      }}
    >
      <Box sx={{ px: 3, py: 3.5 }}>
        <Typography variant="h6" sx={{ color: '#FFFFFF', letterSpacing: '-0.01em' }}>
          Ledger
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
          Personal Expense Tracker
        </Typography>
      </Box>
      <List sx={{ px: 1.5 }}>
        {NAV_ITEMS.map((item) => {
          const selected = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                color: selected ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                bgcolor: selected ? 'rgba(255,255,255,0.08)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                <NavIcon name={item.icon} fontSize="small" />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}>
                {item.label}
              </ListItemText>
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.username}
        </Typography>
        <Tooltip title="Log out">
          <IconButton onClick={handleLogout} size="small" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            <LogoutRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Drawer>
  );
}

export { DRAWER_WIDTH };
