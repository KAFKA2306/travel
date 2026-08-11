import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertNoExternalExecution,
  candidateFreshness,
  createWorkspace,
  decideProposal,
  proposeAction,
  shareWorkspace,
  validateCandidate,
} from '../agent/workspace.mjs'

const source = 'https://www.city.kyoto.lg.jp/'
const now = '2026-08-11T03:00:00Z'

const candidate = {
  id: 'museum-a',
  title: '候補A',
  source_url: source,
  checked_at: '2026-08-10T03:00:00Z',
  price_if_verified: { value: { amount: 1000, currency: 'JPY' }, source_url: source, checked_at: '2026-08-10T03:00:00Z' },
  opening_hours_if_verified: null,
}

test('candidate evidence is fail-closed and stale data is flagged', () => {
  assert.equal(validateCandidate(candidate), candidate)
  assert.deepEqual(candidateFreshness(candidate, { now, maxAgeDays: 30 }), {
    status: 'FRESH', age_days: 1, needs_recheck: false,
  })
  assert.equal(candidateFreshness({ ...candidate, checked_at: '2026-06-01T00:00:00Z' }, { now, maxAgeDays: 30 }).status, 'STALE')
  assert.throws(() => validateCandidate({ ...candidate, source_url: 'http://example.com' }), /HTTPS/)
  assert.throws(() => validateCandidate({ ...candidate, price_if_verified: { value: 1000 } }), /source_url/)
})

test('private workspace has explicit collaborator permissions', () => {
  const workspace = createWorkspace({ workspaceId: 'trip-001', title: '京都徒歩', capabilities: ['read:itinerary'] })
  assert.equal(workspace.visibility, 'private')
  shareWorkspace(workspace, { actor: 'owner', subject: 'friend@example.test', permission: 'viewer', at: now })
  assert.deepEqual(workspace.collaborators, [{ subject: 'friend@example.test', permission: 'viewer' }])
  assert.equal(workspace.audit_log.at(-1).event, 'workspace.shared')
})

test('capabilities deny ambient access', () => {
  const workspace = createWorkspace({ workspaceId: 'trip-002', title: '権限試験', capabilities: ['read:itinerary'] })
  assert.throws(() => proposeAction(workspace, {
    actor: 'agent', capability: 'publish:github', resource: 'repo', input: {}, source_urls: [source], at: now,
  }), /capability not granted/)
})

test('side effects are simulated and require a later human decision', () => {
  const workspace = createWorkspace({
    workspaceId: 'trip-003', title: '予約候補', capabilities: ['purchase:external', 'publish:github'],
  })
  const proposal = proposeAction(workspace, {
    actor: 'agent', capability: 'purchase:external', resource: 'booking-candidate',
    input: { price: 12000 }, source_urls: [source], at: now,
  })
  assert.equal(proposal.status, 'PENDING_APPROVAL')
  assert.equal(proposal.simulation.execution_performed, false)
  const approved = decideProposal(workspace, {
    proposalId: proposal.id, reviewer: 'owner', decision: 'approve', at: '2026-08-11T03:05:00Z',
  })
  assert.equal(approved.status, 'APPROVED_READY')
  assert.equal(approved.simulation.execution_performed, false)
  assert.equal(assertNoExternalExecution(workspace), true)
})

test('read-only/navigation actions never masquerade as completed side effects', () => {
  const workspace = createWorkspace({
    workspaceId: 'trip-004', title: '検索', capabilities: ['navigate:booking'],
  })
  const proposal = proposeAction(workspace, {
    actor: 'agent', capability: 'navigate:booking', resource: 'hotel-page', input: { query: 'Kyoto' }, source_urls: [source], at: now,
  })
  assert.equal(proposal.status, 'SIMULATED')
  assert.equal(proposal.simulation.would_change_external_state, false)
  assert.throws(() => decideProposal(workspace, {
    proposalId: proposal.id, reviewer: 'owner', decision: 'approve', at: now,
  }), /only pending/)
})
