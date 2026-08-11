import { createHash } from 'node:crypto'

export const CONTRACT_VERSION = 'travel-agent-workspace.v1'

export const CAPABILITIES = Object.freeze([
  'read:itinerary',
  'write:itinerary',
  'navigate:booking',
  'publish:github',
  'delete:itinerary',
  'purchase:external',
])

export const SIDE_EFFECT_CAPABILITIES = new Set([
  'publish:github',
  'delete:itinerary',
  'purchase:external',
])

const isoDate = (value, field) => {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO-8601 timestamp`)
  }
  return value
}

const httpsUrl = (value, field) => {
  if (typeof value !== 'string' || !value.startsWith('https://')) {
    throw new Error(`${field} must be an HTTPS URL`)
  }
  return value
}

const stableHash = (value) =>
  createHash('sha256').update(JSON.stringify(value, Object.keys(value).sort())).digest('hex')

export function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') throw new Error('candidate is required')
  if (!candidate.id || !candidate.title) throw new Error('candidate id and title are required')
  httpsUrl(candidate.source_url, 'source_url')
  isoDate(candidate.checked_at, 'checked_at')

  for (const field of ['price_if_verified', 'opening_hours_if_verified']) {
    const evidence = candidate[field]
    if (evidence == null) continue
    if (typeof evidence !== 'object') throw new Error(`${field} must be null or an evidence object`)
    httpsUrl(evidence.source_url, `${field}.source_url`)
    isoDate(evidence.checked_at, `${field}.checked_at`)
    if (!Object.hasOwn(evidence, 'value')) throw new Error(`${field}.value is required`)
  }
  return candidate
}

export function candidateFreshness(candidate, { now, maxAgeDays = 30 }) {
  validateCandidate(candidate)
  isoDate(now, 'now')
  if (!Number.isInteger(maxAgeDays) || maxAgeDays < 1) throw new Error('maxAgeDays must be a positive integer')
  const ageMs = Date.parse(now) - Date.parse(candidate.checked_at)
  if (ageMs < 0) return { status: 'FUTURE_CHECKED_AT', age_days: null, needs_recheck: true }
  const ageDays = Math.floor(ageMs / 86_400_000)
  return {
    status: ageDays > maxAgeDays ? 'STALE' : 'FRESH',
    age_days: ageDays,
    needs_recheck: ageDays > maxAgeDays,
  }
}

export function createWorkspace({ workspaceId, title, visibility = 'private', blueprintId, capabilities = [] }) {
  if (!workspaceId || !title) throw new Error('workspaceId and title are required')
  if (!['private', 'public'].includes(visibility)) throw new Error('visibility must be private or public')
  const unknown = capabilities.filter((capability) => !CAPABILITIES.includes(capability))
  if (unknown.length) throw new Error(`unknown capabilities: ${unknown.join(', ')}`)
  return {
    contract_version: CONTRACT_VERSION,
    workspace_id: workspaceId,
    title,
    visibility,
    blueprint_id: blueprintId ?? null,
    capabilities: [...new Set(capabilities)].sort(),
    collaborators: [],
    itinerary: [],
    proposals: [],
    audit_log: [],
  }
}

export function shareWorkspace(workspace, { actor, subject, permission, at }) {
  if (!actor || !subject) throw new Error('actor and subject are required')
  if (!['viewer', 'editor'].includes(permission)) throw new Error('permission must be viewer or editor')
  isoDate(at, 'at')
  if (workspace.visibility !== 'private') throw new Error('explicit collaborator grants are only valid for private workspaces')
  workspace.collaborators.push({ subject, permission })
  workspace.audit_log.push({
    event: 'workspace.shared', actor, subject, permission, at,
  })
  return workspace
}

export function proposeAction(workspace, { actor, capability, resource, input, source_urls = [], at }) {
  if (!workspace.capabilities.includes(capability)) throw new Error(`capability not granted: ${capability}`)
  if (!actor || !resource) throw new Error('actor and resource are required')
  isoDate(at, 'at')
  for (const url of source_urls) httpsUrl(url, 'source_urls[]')

  const proposalId = `proposal-${workspace.proposals.length + 1}`
  const sideEffect = SIDE_EFFECT_CAPABILITIES.has(capability)
  const proposal = {
    id: proposalId,
    actor,
    capability,
    resource,
    input_hash: stableHash(input ?? null),
    source_urls: [...source_urls],
    status: sideEffect ? 'PENDING_APPROVAL' : 'SIMULATED',
    simulation: {
      would_change_external_state: sideEffect,
      execution_performed: false,
    },
    created_at: at,
    decision: null,
  }
  workspace.proposals.push(proposal)
  workspace.audit_log.push({
    event: 'action.proposed', proposal_id: proposalId, actor, capability, resource,
    input_hash: proposal.input_hash, source_urls: [...source_urls], status: proposal.status, at,
  })
  return proposal
}

export function decideProposal(workspace, { proposalId, reviewer, decision, at }) {
  if (!reviewer) throw new Error('reviewer is required')
  if (!['approve', 'reject'].includes(decision)) throw new Error('decision must be approve or reject')
  isoDate(at, 'at')
  const proposal = workspace.proposals.find((item) => item.id === proposalId)
  if (!proposal) throw new Error(`proposal not found: ${proposalId}`)
  if (proposal.status !== 'PENDING_APPROVAL') throw new Error('only pending side-effect proposals can be decided')
  proposal.status = decision === 'approve' ? 'APPROVED_READY' : 'REJECTED'
  proposal.decision = { reviewer, decision, at }
  workspace.audit_log.push({
    event: 'action.decided', proposal_id: proposalId, reviewer, decision,
    capability: proposal.capability, resource: proposal.resource, at,
  })
  return proposal
}

export function assertNoExternalExecution(workspace) {
  const executed = workspace.proposals.filter((proposal) => proposal.simulation?.execution_performed !== false)
  if (executed.length) throw new Error(`external execution detected: ${executed.map((item) => item.id).join(', ')}`)
  return true
}
