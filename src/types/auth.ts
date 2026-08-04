export const UserRole = { Admin: 'admin', Member: 'member' } as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]
export interface AuthUser {
  readonly email: string
  readonly name: string
  readonly picture?: string
  readonly role: UserRole
  readonly person?: 'Sagar' | 'Tejas'
}

