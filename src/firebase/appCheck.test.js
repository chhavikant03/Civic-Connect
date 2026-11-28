import { describe, expect, it, vi } from 'vitest'
import {
  createAppCheck,
  getAppCheckToken,
  TEST_APPCHECK_TOKEN,
} from './appCheck'

function createSdk() {
  class ReCaptchaV3Provider {
    constructor(siteKey) {
      this.siteKey = siteKey
    }
  }

  class CustomProvider {
    constructor(options) {
      this.options = options
    }
  }

  return {
    ReCaptchaV3Provider,
    CustomProvider,
    initializeAppCheck: vi.fn((app, options) => ({ app, options })),
    getToken: vi.fn(),
  }
}

describe('Firebase App Check', () => {
  it('initializes reCAPTCHA v3 with the configured site key', () => {
    const app = { name: 'civic-connect' }
    const sdk = createSdk()

    const result = createAppCheck(app, {
      MODE: 'production',
      PROD: true,
      VITE_RECAPTCHA_SITE_KEY: 'public-recaptcha-site-key',
    }, sdk)

    expect(result.app).toBe(app)
    expect(result.options.provider).toBeInstanceOf(sdk.ReCaptchaV3Provider)
    expect(result.options.provider.siteKey).toBe('public-recaptcha-site-key')
    expect(result.options.isTokenAutoRefreshEnabled).toBe(true)
  })

  it('uses a deterministic CustomProvider token in tests', async () => {
    const sdk = createSdk()
    const env = { MODE: 'test', PROD: false, VITE_APPCHECK_USE_CUSTOM_PROVIDER: 'true' }
    const appCheck = createAppCheck({ name: 'test-app' }, env, sdk)
    const tokenResult = await appCheck.options.provider.options.getToken()

    expect(tokenResult.token).toBe(TEST_APPCHECK_TOKEN)
    expect(tokenResult.expireTimeMillis).toBeGreaterThan(Date.now())

    sdk.getToken.mockResolvedValue(tokenResult)
    await expect(getAppCheckToken(appCheck, env, sdk)).resolves.toBe(TEST_APPCHECK_TOKEN)
  })

  it('skips App Check in emulator mode', async () => {
    const sdk = createSdk()
    const env = { MODE: 'development', PROD: false, VITE_USE_EMULATORS: 'true' }

    expect(createAppCheck({}, env, sdk)).toBeNull()
    await expect(getAppCheckToken(null, env, sdk)).resolves.toBeNull()
    expect(sdk.initializeAppCheck).not.toHaveBeenCalled()
    expect(sdk.getToken).not.toHaveBeenCalled()
  })

  it('blocks production submissions when the site key or App Check instance is missing', async () => {
    const env = { MODE: 'production', PROD: true, VITE_RECAPTCHA_SITE_KEY: '' }

    expect(createAppCheck({}, env, createSdk())).toBeNull()
    await expect(getAppCheckToken(null, env, createSdk())).rejects.toThrow(/not configured/i)
  })

  it('fails closed when token acquisition fails', async () => {
    const sdk = createSdk()
    sdk.getToken.mockRejectedValue(new Error('network unavailable'))

    await expect(getAppCheckToken({ name: 'app-check' }, {
      MODE: 'production',
      PROD: true,
    }, sdk)).rejects.toThrow(/verification failed/i)
  })

  it('never permits a custom provider in production', () => {
    expect(() => createAppCheck({}, {
      MODE: 'production',
      PROD: true,
      VITE_APPCHECK_USE_CUSTOM_PROVIDER: 'true',
    }, createSdk())).toThrow(/never be enabled in production/i)
  })
})
