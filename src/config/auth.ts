import { z } from 'zod'

const environmentSchema = z.object({
  googleClientId: z.string().trim().min(1, 'VITE_GOOGLE_CLIENT_ID is required.'),
})

export type AuthConfiguration = z.infer<typeof environmentSchema>

export class AuthConfigService {
  readonly result = environmentSchema.safeParse({
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  })

  get isValid() { return this.result.success }
  get googleClientId() { return this.result.success ? this.result.data.googleClientId : '' }
  get errors() { return this.result.success ? [] : this.result.error.issues.map((issue) => issue.message) }
}

export const authConfig = new AuthConfigService()
