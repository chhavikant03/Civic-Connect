# Firebase App Check for citizen reports

Citizen report submissions acquire an App Check token before uploading evidence
or writing the report. The web app uses Firebase App Check with reCAPTCHA v3.

## Production setup

1. Register the Civic Connect web app with the reCAPTCHA v3 provider in Firebase
   Console under **App Check**.
2. Add the production hosting domains to the reCAPTCHA key configuration.
3. Set `VITE_RECAPTCHA_SITE_KEY` to the reCAPTCHA v3 **site key** in the
   deployment environment. The site key is public; never commit a secret key.
4. Deploy the client, confirm valid App Check traffic in Firebase Console, and
   enable enforcement for **Cloud Firestore** and **Cloud Storage**. Enforcement
   is a Firebase Console setting and is not switched on by this source code.
5. Keep the App Check debug-token list restricted to developer devices. Never
   enable the custom test provider in a production build.

Production report submission fails closed when App Check is missing or token
acquisition fails.

## Local development and tests

- With `VITE_USE_EMULATORS=true`, App Check initialization is skipped because
  Firebase Emulator Suite requests do not need production attestation.
- For a local browser connected to a non-emulator Firebase project, set
  `VITE_APPCHECK_DEBUG_TOKEN=true` in an untracked local `.env`. Register the
  generated debug token in Firebase Console for that development app.
- Vitest uses Firebase's `CustomProvider` with a deterministic test token.
  Test tokens and debug tokens must never be used by a production deployment.

## Submission throttling

Every new online or offline-synced report writes
`reportRateLimits/{authenticatedUserId}` in the same Firestore transaction as
the issue document. Firestore rules require the limiter's timestamp to equal
`request.time` and require the previous timestamp to be at least 60 seconds
old. The browser cooldown remains as a convenience only; it is not the
security boundary.
