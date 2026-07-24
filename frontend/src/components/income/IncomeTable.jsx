import {
  Box,
  Card,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import Amount from '../common/Amount';
import CategoryChip from '../common/CategoryChip';
import { formatDate } from '../../utils/format';

const COLUMNS = [
  { key: 'incomeDate', label: 'Date', sortable: true },
  { key: 'incomeCategory.name', label: 'Category', sortable: true },
  { key: 'source', label: 'Source', sortable: true },
  { key: 'description', label: 'Description', sortable: false },
  { key: 'amount', label: 'Amount', sortable: true },
];

export default function IncomeTable({
  incomes,
  page,
  size,
  totalElements,
  sortBy,
  sortDir,
  onSortChange,
  onPageChange,
  onSizeChange,
  onView,
  onEdit,
  onDelete,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSort = (key) => {
    if (!key) return;
    const nextDir = sortBy === key && sortDir === 'DESC' ? 'ASC' : 'DESC';
    onSortChange(key, nextDir);
  };

  if (incomes.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No income records match your filters yet. Try widening the date range or clearing filters.
        </Typography>
      </Box>
    );
  }

  const Actions = ({ income }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      <Tooltip title="View">
        <IconButton size="small" onClick={() => onView(income)}>
          <VisibilityRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(income)}>
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" onClick={() => onDelete(income)}>
          <DeleteRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {incomes.map((income) => (
          <Card key={income.id} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack spacing={0.5}>
                <CategoryChip name={income.incomeCategory?.name} color={income.incomeCategory?.color} />
                <Typography variant="body2" color="text.secondary">
                  {formatDate(income.incomeDate)}
                </Typography>
                {income.source && <Typography variant="body2">{income.source}</Typography>}
              </Stack>
              <Amount value={income.amount} size="body1" />
            </Stack>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
              <Actions income={income} />
            </Stack>
          </Card>
        ))}
        <TablePagination
          component="div"
          count={totalElements}
          page={page}
          onPageChange={(_e, newPage) => onPageChange(newPage)}
          rowsPerPage={size}
          onRowsPerPageChange={(e) => onSizeChange(Number(e.target.value))}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </Stack>
    );
  }

  return (
    <Card>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell key={col.key} align={col.key === 'amount' ? 'right' : 'left'}>
                  {col.sortable ? (
                    <TableSortLabel
                      active={sortBy === col.key}
                      direction={sortDir === 'ASC' ? 'asc' : 'desc'}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {incomes.map((income) => (
              <TableRow key={income.id} hover>
                <TableCell>{formatDate(income.incomeDate)}</TableCell>
                <TableCell>
                  <CategoryChip name={income.incomeCategory?.name} color={income.incomeCategory?.color} />
                </TableCell>
                <TableCell>{income.source || '—'}</TableCell>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Typography variant="body2" noWrap title={income.description}>
                    {income.description || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Amount value={income.amount} size="body2" />
                </TableCell>
                <TableCell align="right">
                  <Actions income={income} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalElements}
        page={page}
        onPageChange={(_e, newPage) => onPageChange(newPage)}
        rowsPerPage={size}
        onRowsPerPageChange={(e) => onSizeChange(Number(e.target.value))}
        rowsPerPageOptions={[10, 20, 50, 100]}
      />
    </Card>
  );
}
