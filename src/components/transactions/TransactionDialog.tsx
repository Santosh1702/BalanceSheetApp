import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material'
import dayjs from 'dayjs'
import { useId } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { canCreateTransaction, canEditTransaction } from '../../domain/transactionCapabilities'
import type { TransactionActor } from '../../domain/transactionCapabilities'
import { PaymentMode, Person, TransactionType } from '../../types/transaction'
import type { Transaction, TransactionInput } from '../../types/transaction'
import { formatTransactionType } from '../../pages/pageUtils'
import './TransactionDialog.css'

const transactionSchema = z.object({
  person: z.enum([Person.Sagar, Person.Tejas]),
  type: z.enum([TransactionType.Deposit, TransactionType.MoneyGiven]),
  amount: z.coerce.number().positive('Enter an amount greater than zero.'),
  date: z.string().min(1, 'Choose a transaction date.'),
  mode: z.enum([PaymentMode.OnlineTransfer, PaymentMode.Cash]),
  note: z.string().trim(),
}).superRefine((transaction, context) => {
  if (transaction.type === TransactionType.MoneyGiven && transaction.note.length === 0) {
    context.addIssue({ code: 'custom', message: 'Enter a short note.', path: ['note'] })
  }
})

const defaultValues: TransactionInput = {
  person: Person.Sagar,
  type: TransactionType.Deposit,
  amount: 0,
  date: dayjs().format('YYYY-MM-DD'),
  mode: PaymentMode.OnlineTransfer,
  note: '',
}

export interface TransactionDialogProps {
  actor: TransactionActor
  defaultPerson?: Person
  editing: Transaction | null
  onClose: () => void
  onSave: (data: TransactionInput) => void
  open: boolean
  saving: boolean
}

export function TransactionDialog({ actor, defaultPerson, editing, onClose, onSave, open, saving }: TransactionDialogProps) {
  const formId = useId()
  const isAdmin = canEditTransaction(actor)
  const userPerson = actor.person ?? Person.Sagar
  const form = useForm({
    resolver: zodResolver(transactionSchema),
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
        person: isAdmin ? defaultPerson ?? Person.Sagar : userPerson,
      },
  })

  const selectedPerson = useWatch({ control: form.control, name: 'person' })
  const availablePeople = Object.values(Person).filter((person) => (
    canCreateTransaction(actor, { person, type: TransactionType.Deposit })
  ))
  const availableTypes = Object.values(TransactionType).filter((type, index, types) => (
    types.indexOf(type) === index && canCreateTransaction(actor, { person: selectedPerson, type })
  ))
  const personFieldDisabled = !isAdmin && Boolean(editing)
  const typeFieldDisabled = !isAdmin && editing?.type === TransactionType.MoneyGiven

  return (
    <Dialog fullWidth maxWidth="sm" onClose={onClose} open={open}>
      <DialogTitle>{editing ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
      <DialogContent>
        <form
          className="transaction-form"
          id={formId}
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
                {availablePeople.map((person) => <MenuItem key={person} value={person}>{person}</MenuItem>)}
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
                {availableTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {formatTransactionType(type)}
                  </MenuItem>
                ))}
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
        <Button disabled={saving} form={formId} type="submit" variant="contained">
          {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
