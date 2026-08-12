import { z } from 'zod'
import { apiClient, assertApiConfigured } from './apiClient'
import { UserRole } from '../types/auth'

const authProfileSchema = z.object({
  email: z.email(),
  name: z.string(),
  role: z.enum([UserRole.Admin, UserRole.Member]),
  person: z.enum(['', 'Sagar', 'Tejas']),
}).superRefine((profile, context) => {
  if (profile.role === UserRole.Member && profile.person === '') {
    context.addIssue({
      code: 'custom',
      message: 'Members require a supported person.',
      path: ['person'],
    })
  }
})

export type AuthProfile = z.infer<typeof authProfileSchema>

interface ApiResponse<T> {
  readonly ok: boolean
  readonly data?: T
  readonly error?: string
}

export const authService = {
  me: async (idToken: string): Promise<AuthProfile> => {
    assertApiConfigured()
    const response = await apiClient.post<ApiResponse<unknown>>('', {
      idToken,
      action: 'auth.me',
    })

    if (!response.data.ok || !response.data.data) {
      throw new Error(response.data.error || 'Unable to authenticate this Google account.')
    }

    return authProfileSchema.parse(response.data.data)
  },
}
