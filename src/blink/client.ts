import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'hub-interface-ohy5p3hs',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_qB_j1S3gpez85O4oPu43nLPbRQsJ91iw',
  authRequired: false,
  auth: { mode: 'managed' },
})
