import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteIcon from '@mui/icons-material/Delete'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useCallback, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '../../hooks/useAuth'
import { transactionService } from '../../services/transactionService'
import { UserRole } from '../../types/auth'
import { PaymentMode, Person, TransactionType } from '../../types/transaction'
import type { Transaction, TransactionInput } from '../../types/transaction'
import './TransactionsPage.css'

const schema = z.object({
  person: z.enum([Person.Sagar, Person.Tejas]),
  type: z.enum([TransactionType.Deposit, TransactionType.Payment]),
  amount: z.coerce.number().positive('Enter an amount greater than zero.'),
  date: z.string().min(1, 'Choose a transaction date.'),
  mode: z.enum([PaymentMode.OnlineTransfer, PaymentMode.Cash]),
  note: z.string().trim().min(1, 'Enter a short note.'),
})

function formatTransactionType(type: TransactionType) {
  return type === TransactionType.Deposit ? 'Deposit' : 'Payment'
}

function createInputKey(input: TransactionInput) {
  return JSON.stringify({ person: input.person, type: input.type, amount: input.amount, date: input.date, mode: input.mode, note: input.note })
}

const defaultValues: TransactionInput = {
  person: Person.Sagar,
  type: TransactionType.Deposit,
  amount: 0,
  date: dayjs().format('YYYY-MM-DD'),
  mode: PaymentMode.OnlineTransfer,
  note: '',
}

export function TransactionsPage() {
  const { user, idToken } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [open, setOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const createRequest = useRef<{ id: string; inputKey: string } | null>(null)

  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionService.list(idToken!),
    enabled: Boolean(idToken),
  })

  const invalidate = () => client.invalidateQueries({ queryKey: ['transactions'] })
  const clearCreateRequest = useCallback(() => { createRequest.current = null }, [])

  const save = useMutation({
    mutationFn: (data: TransactionInput) => {
      if (editing) return transactionService.update(idToken!, editing.id, editing.updatedAt, data)
      const inputKey = createInputKey(data)
      if (!createRequest.current || createRequest.current.inputKey !== inputKey) createRequest.current = { id: crypto.randomUUID(), inputKey }
      return transactionService.create(idToken!, createRequest.current.id, data)
    },
    onSuccess: () => {
      clearCreateRequest()
      setOpen(false)
      setEditing(null)
      invalidate()
      setNotice(editing ? 'Transaction updated.' : 'Transaction created.')
    },
    onError: (error: Error) => {
      setNotice(error.message)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => transactionService.remove(idToken!, id),
    onSuccess: () => {
      setConfirmId(null)
      invalidate()
      setNotice('Transaction deleted.')
    },
    onError: (error: Error) => {
      setNotice(error.message)
    },
  })

  const isAdmin = user?.role === UserRole.Admin
  const personDefault = user?.person ?? Person.Sagar
  const visibleTransactions = (query.data ?? []).filter((transaction) => {
    if (isAdmin) return true
    return transaction.person === personDefault
  })

  const startCreate = () => {
    clearCreateRequest()
    setEditing(null)
    setOpen(true)
  }

  const startEdit = (transaction: Transaction) => {
    setEditing(transaction)
    setOpen(true)
  }

  return (
    <section className="transactions-page">
      <div className="transactions-page__heading">
        <div>
          <Typography component="h1" variant="h1">Transactions</Typography>
          <Typography color="text.secondary">Record deposits and money given for the ledger.</Typography>
        </div>
        <Button onClick={startCreate} startIcon={<AddOutlinedIcon />} variant="contained">Add transaction</Button>
      </div>

      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {query.isLoading && <Typography>Loading transactions…</Typography>}

      {!query.isLoading && (
        <Paper className="transactions-table">
          {visibleTransactions.length === 0 && (
            <div className="transaction-empty">
              <Typography color="text.secondary">No transactions available.</Typography>
            </div>
          )}

          {visibleTransactions.map((transaction) => {
            const canEditCurrent = isAdmin || transaction.person === personDefault
            return (
              <article className="transaction-row" key={transaction.id}>
                <div>
                  <Typography sx={{ fontWeight: 700 }}>{transaction.person}</Typography>
                  <Typography color="text.secondary" variant="body2">{transaction.date} · {transaction.mode.replace('_', ' ')}</Typography>
                </div>
                <div>
                  <Typography className={transaction.type === TransactionType.Deposit ? 'amount amount--deposit' : 'amount amount--money-given'}>
                    {transaction.type === TransactionType.Deposit ? '+' : '-'}{transaction.amount}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">{formatTransactionType(transaction.type)}</Typography>
                </div>
                <Typography className="transaction-note">{transaction.note}</Typography>
                <div className="transactions-page__actions">
                  {canEditCurrent && (
                    <IconButton aria-label="Edit transaction" onClick={() => startEdit(transaction)}>
                      <EditOutlinedIcon />
                    </IconButton>
                  )}
                  {isAdmin && (
                    <IconButton aria-label="Delete transaction" onClick={() => setConfirmId(transaction.id)}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </div>
              </article>
            )
          })}
        </Paper>
      )}

      <TransactionDialog
        editing={editing}
        isAdmin={isAdmin}
        onClose={() => {
          clearCreateRequest()
          setOpen(false)
        }}
        onSave={(data) => save.mutate(data as TransactionInput)}
        open={open}
        saving={save.isPending}
        userName={(user?.person ?? Person.Sagar) as Person}
      />

      <Dialog open={Boolean(confirmId)} onClose={() => setConfirmId(null)}>
        <DialogTitle>Delete transaction</DialogTitle>
        <DialogContent>
          <Typography>Delete this transaction permanently?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmId(null)}>Cancel</Button>
          <Button
            color="error"
            disabled={remove.isPending}
            onClick={() => {
              if (confirmId) remove.mutate(confirmId)
            }}
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar autoHideDuration={4000} onClose={() => setNotice(null)} open={Boolean(notice)} message={notice} />
    </section>
  )
}

function TransactionDialog({
  editing,
  isAdmin,
  onClose,
  onSave,
  open,
  saving,
  userName,
}: {
  editing: Transaction | null
  isAdmin: boolean
  onClose: () => void
  onSave: (data: TransactionInput) => void
  open: boolean
  saving: boolean
  userName: Person
}) {
  const form = useForm({
    resolver: zodResolver(schema),
    values: editing
      ? {
        person: editing.person,
        type: editing.type,
        amount: editing.amount,
        date: editing.date,
        mode: editing.mode,
        note: editing.note,
      }
      : {
        ...defaultValues,
        person: isAdmin ? Person.Sagar : userName,
      },
  })

  const personFieldDisabled = !isAdmin && Boolean(editing)
  const typeFieldDisabled = !isAdmin && editing?.type === TransactionType.Payment

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>{editing ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
      <DialogContent>
        <form
          className="transaction-form"
          id="transaction-form"
          onSubmit={form.handleSubmit((data) => onSave(data as TransactionInput))}
        >
          <Controller
            control={form.control}
            name="person"
            render={({ field }) => (
              <TextField
                {...field}
                disabled={personFieldDisabled}
                error={Boolean(form.formState.errors.person)}
                helperText={form.formState.errors.person?.message}
                label="Person"
                select
              >
                {isAdmin ? <MenuItem value={Person.Sagar}>Sagar</MenuItem> : null}
                {isAdmin ? <MenuItem value={Person.Tejas}>Tejas</MenuItem> : null}
                {!isAdmin && <MenuItem value={userName}>{userName}</MenuItem>}
              </TextField>
            )}
          />

          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <TextField
                {...field}
                disabled={typeFieldDisabled}
                error={Boolean(form.formState.errors.type)}
                helperText={form.formState.errors.type?.message}
                label="Type"
                select
              >
                <MenuItem value={TransactionType.Deposit}>Deposit</MenuItem>
                {isAdmin && <MenuItem value={TransactionType.Payment}>Payment</MenuItem>}
              </TextField>
            )}
          />

          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => (
              <TextField
                {...field}
                error={Boolean(form.formState.errors.amount)}
                helperText={form.formState.errors.amount?.message}
                label="Amount"
                type="number"
              />
            )}
          />

          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <TextField
                {...field}
                error={Boolean(form.formState.errors.date)}
                helperText={form.formState.errors.date?.message}
                label="Date"
                type="date"
              />
            )}
          />

          <Controller
            control={form.control}
            name="mode"
            render={({ field }) => (
              <TextField
                {...field}
                error={Boolean(form.formState.errors.mode)}
                helperText={form.formState.errors.mode?.message}
                label="Mode"
                select
              >
                <MenuItem value={PaymentMode.OnlineTransfer}>Online transfer</MenuItem>
                <MenuItem value={PaymentMode.Cash}>Cash</MenuItem>
              </TextField>
            )}
          />

          <Controller
            control={form.control}
            name="note"
            render={({ field }) => (
              <TextField
                {...field}
                error={Boolean(form.formState.errors.note)}
                helperText={form.formState.errors.note?.message}
                label="Note"
                multiline
                minRows={2}
              />
            )}
          />
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={saving} form="transaction-form" type="submit" variant="contained">
          {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
