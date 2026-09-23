import { rmSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Starts a live run afresh in LIVE_EVIDENCE_DIR: a new run ID and baseline, and no
 * leftover allowance or rate-window notes. The created-logs ledger is kept, so cleanup
 * also deletes anything an earlier, interrupted run left behind.
 */
export default function globalSetup() {
  const evidenceDir = process.env.LIVE_EVIDENCE_DIR!
  for (const name of ['run.json', 'allowance-used-up.json', 'rate-window.json']) rmSync(join(evidenceDir, name), { force: true })
}
