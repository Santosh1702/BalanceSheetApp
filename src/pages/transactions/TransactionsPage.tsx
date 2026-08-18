import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteIcon from '@mui/icons-material/Delete'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Button,
  IconButton,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { DeleteTransactionDialog } from '../../components/transactions/DeleteTransactionDialog'
import { TransactionDialog } from '../../components/transactions/TransactionDialog'
import { canDeleteTransaction, canEditTransaction } from '../../domain/transactionCapabilities'
import { useAuth } from '../../hooks/useAuth'
import { transactionService } from '../../services/transactionService'
import { UserRole } from '../../types/auth'
import { Person, TransactionType } from '../../types/transaction'
import type { Transaction, TransactionInput } from '../../types/transaction'
import { formatTransactionType } from '../pageUtils'
import './TransactionsPage.css'

function createInputKey(input: TransactionInput) {
  return JSON.stringify({ person: input.person, type: input.type, amount: input.amount, date: input.date, mode: input.mode, note: input.note })
}

export function TransactionsPage() {
  const { user, idToken } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
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
      setDeleteTarget(null)
      invalidate()
      setNotice('Transaction deleted.')
    },
    onError: (error: Error) => {
      setNotice(error.message)
    },
  })

  const isAdmin = user?.role === UserRole.Admin
  const canEdit = user ? canEditTransaction(user) : false
  const canDelete = user ? canDeleteTransaction(user) : false
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
                  {canEdit && (
                    <IconButton aria-label="Edit transaction" onClick={() => startEdit(transaction)}>
                      <EditOutlinedIcon />
                    </IconButton>
                  )}
                  {canDelete && (
                    <IconButton aria-label="Delete transaction" onClick={() => setDeleteTarget(transaction)}>
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
        actor={user ?? { role: UserRole.Member, person: Person.Sagar }}
        editing={editing}
        onClose={() => {
          clearCreateRequest()
          setOpen(false)
        }}
        onSave={(data) => save.mutate(data as TransactionInput)}
        open={open}
        saving={save.isPending}
      />

      {canDelete && (
        <DeleteTransactionDialog
          deleting={remove.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(transaction) => remove.mutate(transaction.id)}
          transaction={deleteTarget}
        />
      )}

      <Snackbar autoHideDuration={4000} onClose={() => setNotice(null)} open={Boolean(notice)} message={notice} />
    </section>
  )
}
