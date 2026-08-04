export const TransactionType = { Deposit: 'DEPOSIT', Withdrawal: 'WITHDRAWAL' } as const
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]
export const PaymentMode = { OnlineTransfer: 'ONLINE_TRANSFER', Cash: 'CASH' } as const
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode]
export interface Transaction { readonly id: string; readonly person: string; readonly type: TransactionType; readonly amount: number; readonly date: string; readonly mode: PaymentMode; readonly note: string; readonly createdBy: string; readonly createdAt: string; readonly updatedBy: string; readonly updatedAt: string }
export type TransactionInput = Pick<Transaction, 'person' | 'type' | 'amount' | 'date' | 'mode' | 'note'>
