import {
  CustomProvider,
  getToken,
  initializeAppCheck,
  ReCaptchaV3Provider,
} from 'firebase/app-check'

export const TEST_APPCHECK_TOKEN = 'civic-connect-test-app-check-token'

const defaultSdk = {
  CustomProvider,
  getToken,
  initializeAppCheck,
  ReCaptchaV3Provider,
}

/**
 * Initialize App Check once, immediately after the Firebase app is created.
 * Emulator mode skips production attestation; tests can use a deterministic
 * custom provider without making network requests.
 */
export function createAppCheck(app, env, sdk = defaultSdk) {
  if (env.VITE_USE_EMULATORS === 'true') return null

  const useCustomProvider =
    env.MODE === 'test' || env.VITE_APPCHECK_USE_CUSTOM_PROVIDER === 'true'

  if (useCustomProvider) {
    if (env.PROD) {
      throw new Error('The App Check custom provider must never be enabled in production.')
    }

    const token = env.VITE_APPCHECK_TEST_TOKEN || TEST_APPCHECK_TOKEN
    const provider = new sdk.CustomProvider({
      getToken: async () => ({
        token,
        expireTimeMillis: Date.now() + 60 * 60 * 1000,
      }),
    })

    return sdk.initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: false,
    })
  }

  const siteKey = env.VITE_RECAPTCHA_SITE_KEY?.trim()
  if (!siteKey) return null

  // Enable Firebase's debug-token hook only when explicitly configured locally.
  if (!env.PROD && env.VITE_APPCHECK_DEBUG_TOKEN && typeof self !== 'undefined') {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN =
      env.VITE_APPCHECK_DEBUG_TOKEN === 'true'
        ? true
        : env.VITE_APPCHECK_DEBUG_TOKEN
  }

  return sdk.initializeAppCheck(app, {
    provider: new sdk.ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

/**
 * Acquire a token before a report uploads evidence or writes Firestore data.
 * Firebase SDK requests attach the cached token automatically after setup.
 */
export async function getAppCheckToken(appCheck, env, sdk = defaultSdk) {
  if (env.VITE_USE_EMULATORS === 'true') {
    if (env.PROD) {
      throw new Error('Firebase emulator mode cannot be used in a production build.')
    }
    return null
  }

  if (!appCheck) {
    if (env.PROD) {
      throw new Error('Report security verification is not configured. Please try again later.')
    }
    return null
  }

  try {
    const result = await sdk.getToken(appCheck)
    if (!result?.token) throw new Error('App Check returned an empty token.')
    return result.token
  } catch (error) {
    const verificationError = new Error(
      'Security verification failed. Please retry your report submission.'
    )
    verificationError.cause = error
    throw verificationError
  }
}
