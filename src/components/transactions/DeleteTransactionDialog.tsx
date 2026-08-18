import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import type { Transaction } from '../../types/transaction'
import { currency, formatTransactionType } from '../../pages/pageUtils'

export interface DeleteTransactionDialogProps {
  deleting: boolean
  onClose: () => void
  onConfirm: (transaction: Transaction) => void
  transaction: Transaction | null
}

export function DeleteTransactionDialog({ deleting, onClose, onConfirm, transaction }: DeleteTransactionDialogProps) {
  return (
    <Dialog open={Boolean(transaction)} onClose={onClose}>
      <DialogTitle>Delete transaction</DialogTitle>
      <DialogContent>
        {transaction && (
          <Typography>
            Delete the {formatTransactionType(transaction.type).toLowerCase()} of {currency.format(transaction.amount)} for{' '}
            {transaction.person} on {transaction.date} permanently?
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          disabled={deleting}
          onClick={() => {
            if (transaction) onConfirm(transaction)
          }}
          variant="contained"
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  )
}

