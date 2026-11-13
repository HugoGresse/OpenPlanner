import firebase from 'firebase-admin'
import { expect } from 'vitest'
import { BuildProposalResult, Proposal } from '../routes/chat/toolKit'
import { buildProposal, executeTool } from '../routes/chat/tools'

export const EVENT_ID = 'evt'
const firebaseApp = {} as firebase.app.App

export const read = (name: string, args: Record<string, unknown> = {}) => executeTool(firebaseApp, EVENT_ID, name, args)

export const propose = (name: string, args: Record<string, unknown>) =>
    buildProposal({ firebaseApp, eventId: EVENT_ID, name, args })

export const expectProposal = (result: BuildProposalResult): Proposal => {
    if (!result.ok) throw new Error(`Expected a proposal, got: ${result.error}`)
    return result.proposal
}

export const expectRejected = (result: BuildProposalResult, message: string | RegExp) => {
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(message)
}

export const UUID = /^[0-9a-f-]{36}$/
