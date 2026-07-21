import { Chip } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';

export default function CategoryChip({ name, color }) {
  return (
    <Chip
      size="small"
      icon={<CircleIcon sx={{ fontSize: '10px !important', color: `${color} !important` }} />}
      label={name}
      variant="outlined"
      sx={{
        borderColor: color ? `${color}55` : undefined,
        bgcolor: color ? `${color}14` : undefined,
        color: 'text.primary',
      }}
    />
  );
}
