import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { transactionService } from '../services/transactionService'
import type { Transaction, TransactionInput } from '../types/transaction'

function createInputKey(input: TransactionInput) {
  return JSON.stringify({ person: input.person, type: input.type, amount: input.amount, date: input.date, mode: input.mode, note: input.note })
}

export function useTransactionMutations({
  editing,
  idToken,
  onDeleteSuccess,
  onSaveSuccess,
}: {
  editing: Transaction | null
  idToken: string | null
  onDeleteSuccess: () => void
  onSaveSuccess: () => void
}) {
  const client = useQueryClient()
  const [notice, setNotice] = useState<string | null>(null)
  const createRequest = useRef<{ id: string; inputKey: string } | null>(null)
  const clearCreateRequest = useCallback(() => { createRequest.current = null }, [])
  const invalidate = () => client.invalidateQueries({ queryKey: ['transactions'] })

  const save = useMutation({
    mutationFn: (data: TransactionInput) => {
      if (editing) return transactionService.update(idToken!, editing.id, editing.updatedAt, data)
      const inputKey = createInputKey(data)
      if (!createRequest.current || createRequest.current.inputKey !== inputKey) {
        createRequest.current = { id: crypto.randomUUID(), inputKey }
      }
      return transactionService.create(idToken!, createRequest.current.id, data)
    },
    onSuccess: () => {
      clearCreateRequest()
      invalidate()
      setNotice(editing ? 'Transaction updated.' : 'Transaction created.')
      onSaveSuccess()
    },
    onError: (error: Error) => setNotice(error.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => transactionService.remove(idToken!, id),
    onSuccess: () => {
      invalidate()
      setNotice('Transaction deleted.')
      onDeleteSuccess()
    },
    onError: (error: Error) => setNotice(error.message),
  })

  return { clearCreateRequest, notice, remove, save, setNotice }
}

