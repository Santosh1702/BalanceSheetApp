import { z } from 'zod'
import { UserRole } from '../types/auth'

const allowedUserSchema = z.object({
  email: z.email('Each allowed user must have a valid email address.').transform((email) => email.trim().toLowerCase()),
  role: z.enum([UserRole.Admin, UserRole.Member]),
  person: z.enum(['Sagar', 'Tejas']).optional(),
})

const environmentSchema = z.object({
  googleClientId: z.string().trim().min(1, 'VITE_GOOGLE_CLIENT_ID is required.'),
  allowedUsers: z.array(allowedUserSchema).min(1, 'VITE_ALLOWED_USERS must include at least one user.'),
}).superRefine(({ allowedUsers }, context) => {
  const emails = new Set<string>()
  allowedUsers.forEach((user, index) => {
    if (emails.has(user.email)) context.addIssue({ code: 'custom', message: `Duplicate allowed-user email: ${user.email}.`, path: ['allowedUsers', index, 'email'] })
    emails.add(user.email)
  })
})

export type AllowedUser = z.infer<typeof allowedUserSchema>
export type AuthConfiguration = z.infer<typeof environmentSchema>

function parseAllowedUsers(value: string | undefined): unknown {
  if (!value) return []
  try { return JSON.parse(value) } catch { return value }
}

export class AuthConfigService {
  readonly result = environmentSchema.safeParse({
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    allowedUsers: parseAllowedUsers(import.meta.env.VITE_ALLOWED_USERS),
  })

  get isValid() { return this.result.success }
  get googleClientId() { return this.result.success ? this.result.data.googleClientId : '' }
  get allowedUsers(): readonly AllowedUser[] { return this.result.success ? this.result.data.allowedUsers : [] }
  get errors() { return this.result.success ? [] : this.result.error.issues.map((issue) => issue.message) }

  getProfileForEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase()
    return this.allowedUsers.find((user) => user.email === normalizedEmail)
  }

  getRoleForEmail(email: string) {
    return this.getProfileForEmail(email)?.role
  }
}

export const authConfig = new AuthConfigService()
