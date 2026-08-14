import { z } from 'zod'

export const Person = { Sagar: 'Sagar', Tejas: 'Tejas' } as const
export type Person = (typeof Person)[keyof typeof Person]

export const TransactionType = {
  Deposit: 'DEPOSIT',
  Payment: 'MONEY_GIVEN',
  MoneyGiven: 'MONEY_GIVEN',
} as const
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType]

export const PaymentMode = { OnlineTransfer: 'ONLINE_TRANSFER', Cash: 'CASH' } as const
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode]

function isBusinessDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12 || day < 1) return false

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= daysInMonth[month - 1]
}

const nonEmptyString = z.string().refine((value) => value.trim().length > 0)
const isoTimestamp = z.iso.datetime({ precision: 3 })

export const transactionResponseSchema = z.strictObject({
  id: nonEmptyString,
  person: z.enum([Person.Sagar, Person.Tejas]),
  type: z.enum([TransactionType.Deposit, TransactionType.MoneyGiven]),
  amount: z.number().finite().positive(),
  date: z.string().refine(isBusinessDate),
  mode: z.enum([PaymentMode.OnlineTransfer, PaymentMode.Cash]),
  note: z.string(),
  createdBy: nonEmptyString,
  createdAt: isoTimestamp,
  updatedBy: nonEmptyString,
  updatedAt: isoTimestamp,
})

export const transactionListResponseSchema = z.array(transactionResponseSchema)
export const transactionDeleteResponseSchema = z.strictObject({ id: nonEmptyString })

export type Transaction = Readonly<z.infer<typeof transactionResponseSchema>>
export type TransactionInput = Pick<Transaction, 'person' | 'type' | 'amount' | 'date' | 'mode' | 'note'>
