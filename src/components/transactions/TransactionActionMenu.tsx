import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'
import type { Transaction } from '../../types/transaction'
import { currency, formatTransactionType } from '../../pages/pageUtils'

export function TransactionActionMenu({ transaction, onDelete, onEdit }: { transaction: Transaction; onDelete: (transaction: Transaction) => void; onEdit: (transaction: Transaction) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const label = `Actions for ${formatTransactionType(transaction.type).toLowerCase()} of ${currency.format(transaction.amount)} on ${transaction.date}`
  return (
    <>
      <IconButton aria-label={label} onClick={(event) => setAnchor(event.currentTarget)}><MoreHorizIcon /></IconButton>
      <Menu anchorEl={anchor} onClose={() => setAnchor(null)} open={Boolean(anchor)}>
        <MenuItem onClick={() => { setAnchor(null); onEdit(transaction) }}><ListItemIcon><EditOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText>Edit</ListItemText></MenuItem>
        <MenuItem onClick={() => { setAnchor(null); onDelete(transaction) }}><ListItemIcon><DeleteOutlinedIcon color="error" fontSize="small" /></ListItemIcon><ListItemText>Delete</ListItemText></MenuItem>
      </Menu>
    </>
  )
}
