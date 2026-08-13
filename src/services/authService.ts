import { z } from 'zod'
import { apiClient, apiErrorMessage, assertApiConfigured } from './apiClient'
import type { ApiResponse } from './apiClient'
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

export const authService = {
  me: async (idToken: string): Promise<AuthProfile> => {
    assertApiConfigured()
    const response = await apiClient.post<ApiResponse<unknown>>('', {
      idToken,
      action: 'auth.me',
    })

    if (!response.data.ok || !response.data.data) {
      throw new Error(apiErrorMessage(response.data, 'Unable to authenticate this Google account.'))
    }

    return authProfileSchema.parse(response.data.data)
  },
}
