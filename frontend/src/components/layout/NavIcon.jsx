import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';

const ICONS = {
  dashboard: DashboardRoundedIcon,
  receipt: ReceiptLongRoundedIcon,
  category: CategoryRoundedIcon,
  assessment: AssessmentRoundedIcon,
  group: GroupRoundedIcon,
  settings: SettingsRoundedIcon,
};

export default function NavIcon({ name, ...props }) {
  const Icon = ICONS[name] || DashboardRoundedIcon;
  return <Icon {...props} />;
}
