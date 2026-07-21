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
import { paymentModeLabel } from '../../utils/constants';

const COLUMNS = [
  { key: 'expenseDate', label: 'Date', sortable: true },
  { key: 'category.name', label: 'Category', sortable: true },
  { key: 'merchant', label: 'Merchant', sortable: true },
  { key: 'description', label: 'Description', sortable: false },
  { key: 'paymentMode', label: 'Payment mode', sortable: false },
  { key: 'amount', label: 'Amount', sortable: true },
];

export default function ExpenseTable({
  expenses,
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

  if (expenses.length === 0) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">
          No expenses match your filters yet. Try widening the date range or clearing filters.
        </Typography>
      </Box>
    );
  }

  const Actions = ({ expense }) => (
    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
      <Tooltip title="View">
        <IconButton size="small" onClick={() => onView(expense)}>
          <VisibilityRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(expense)}>
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" onClick={() => onDelete(expense)}>
          <DeleteRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  if (isMobile) {
    return (
      <Stack spacing={1.5}>
        {expenses.map((expense) => (
          <Card key={expense.id} sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack spacing={0.5}>
                <CategoryChip name={expense.category?.name} color={expense.category?.color} />
                <Typography variant="body2" color="text.secondary">
                  {formatDate(expense.expenseDate)} · {paymentModeLabel(expense.paymentMode)}
                </Typography>
                {expense.merchant && <Typography variant="body2">{expense.merchant}</Typography>}
              </Stack>
              <Amount value={expense.amount} size="body1" />
            </Stack>
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
              <Actions expense={expense} />
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
            {expenses.map((expense) => (
              <TableRow key={expense.id} hover>
                <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                <TableCell>
                  <CategoryChip name={expense.category?.name} color={expense.category?.color} />
                </TableCell>
                <TableCell>{expense.merchant || '—'}</TableCell>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Typography variant="body2" noWrap title={expense.description}>
                    {expense.description || '—'}
                  </Typography>
                </TableCell>
                <TableCell>{paymentModeLabel(expense.paymentMode)}</TableCell>
                <TableCell align="right">
                  <Amount value={expense.amount} size="body2" />
                </TableCell>
                <TableCell align="right">
                  <Actions expense={expense} />
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
