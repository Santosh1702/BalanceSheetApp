import { UserRole } from '../types/auth'
import type { AuthUser } from '../types/auth'
import { TransactionType } from '../types/transaction'
import type { Transaction } from '../types/transaction'

type TransactionActor = Pick<AuthUser, 'role' | 'person'>
type TransactionTarget = Pick<Transaction, 'person' | 'type'>

export function canCreateTransaction(actor: TransactionActor, target: TransactionTarget) {
  if (actor.role === UserRole.Admin) return true
  return target.type === TransactionType.Deposit && Boolean(actor.person) && target.person === actor.person
}

export function canEditTransaction(actor: TransactionActor) {
  return actor.role === UserRole.Admin
}

export function canDeleteTransaction(actor: TransactionActor) {
  return actor.role === UserRole.Admin
}
