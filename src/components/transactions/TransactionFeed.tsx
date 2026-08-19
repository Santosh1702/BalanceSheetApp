import { Typography } from '@mui/material'
import { TransactionType } from '../../types/transaction'
import type { Transaction } from '../../types/transaction'
import { currency, formatMode, formatTransactionType } from '../../pages/pageUtils'
import { TransactionActionMenu } from './TransactionActionMenu'

function sortTransactions(transactions: readonly Transaction[]) {
  return [...transactions].sort((left, right) => (
    right.date.localeCompare(left.date)
    || right.createdAt.localeCompare(left.createdAt)
    || right.id.localeCompare(left.id)
  ))
}

export function TransactionFeed({ canManage, emptyMessage, onDelete, onEdit, transactions }: {
  canManage: boolean
  emptyMessage: string
  onDelete: (transaction: Transaction) => void
  onEdit: (transaction: Transaction) => void
  transactions: readonly Transaction[]
}) {
  const sorted = sortTransactions(transactions)
  if (sorted.length === 0) return <Typography color="text.secondary">{emptyMessage}</Typography>

  return (
    <div className="dashboard-feed">
      {sorted.map((transaction, index) => {
        const showDate = index === 0 || transaction.date !== sorted[index - 1].date
        const isDeposit = transaction.type === TransactionType.Deposit
        return (
          <div className="dashboard-feed__entry" key={transaction.id}>
            {showDate && <Typography className="dashboard-feed__date" component="h3" variant="body2">{transaction.date}</Typography>}
            <article className={`dashboard-transaction ${isDeposit ? 'dashboard-transaction--deposit' : 'dashboard-transaction--withdrawal'}`}>
              <div className="dashboard-transaction__body">
                <Typography className={isDeposit ? 'financial-positive' : 'financial-negative'} component="p">
                  {isDeposit ? '+' : '−'} {currency.format(transaction.amount)}
                </Typography>
                <Typography variant="body2">{formatTransactionType(transaction.type)} · {formatMode(transaction.mode)}</Typography>
                {transaction.note && <Typography color="text.secondary" variant="body2">{transaction.note}</Typography>}
              </div>
              {canManage && <TransactionActionMenu onDelete={onDelete} onEdit={onEdit} transaction={transaction} />}
            </article>
          </div>
        )
      })}
    </div>
  )
}
