export interface GoogleIdTokenClaims {
  exp?: number
  email?: string
  name?: string
  picture?: string
}

export function decodeGoogleIdToken(credential: string): GoogleIdTokenClaims {
  try {
    const encoded = credential.split('.')[1]
    if (!encoded) return {}
    return JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))) as GoogleIdTokenClaims
  } catch {
    return {}
  }
}

export function getTokenExpiryMs(credential: string): number | null {
  const exp = decodeGoogleIdToken(credential).exp
  return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null
}

export function isTokenExpired(credential: string, clockSkewMs = 30_000): boolean {
  const expiryMs = getTokenExpiryMs(credential)
  return expiryMs !== null && Date.now() >= expiryMs - clockSkewMs
}
