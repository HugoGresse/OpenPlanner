import firebase from 'firebase-admin'
import {
    BuildProposalResult,
    ChatTool,
    ProposalTool,
    ReadTool,
    ToolArgs,
    ToolDefinition,
    toDefinition,
} from './toolKit'
import { EVENT_TOOLS } from './tools/eventTools'
import { FAQ_TOOLS } from './tools/faqTools'
import { JOB_POST_TOOLS } from './tools/jobPostTools'
import { PENDING_EDIT_TOOLS } from './tools/pendingEditTools'
import { SESSION_TOOLS } from './tools/sessionTools'
import { SPEAKER_TOOLS } from './tools/speakerTools'
import { SPONSOR_TOOLS } from './tools/sponsorTools'
import { TEAM_TOOLS } from './tools/teamTools'

export type { Proposal, ToolDefinition } from './toolKit'

// Every tool of the event assistant (in-app chat and Slack bot). Read tools return data, proposal tools never
// write: they return a Proposal the user approves, which then calls the REST route named by its capability.
export const CHAT_TOOLS: ChatTool[] = [
    ...EVENT_TOOLS,
    ...SESSION_TOOLS,
    ...SPEAKER_TOOLS,
    ...PENDING_EDIT_TOOLS,
    ...SPONSOR_TOOLS,
    ...JOB_POST_TOOLS,
    ...TEAM_TOOLS,
    ...FAQ_TOOLS,
]

const READ_TOOLS = CHAT_TOOLS.filter((tool): tool is ReadTool => tool.type === 'read')
const WRITE_TOOLS = CHAT_TOOLS.filter((tool): tool is ProposalTool => tool.type === 'proposal')

export const READ_ONLY_TOOLS: ToolDefinition[] = READ_TOOLS.map(toDefinition)
export const PROPOSAL_TOOLS: ToolDefinition[] = WRITE_TOOLS.map(toDefinition)

export const isProposalTool = (name: string): boolean => WRITE_TOOLS.some((tool) => tool.name === name)

export const executeTool = async (
    firebaseApp: firebase.app.App,
    eventId: string,
    name: string,
    args: ToolArgs
): Promise<unknown> => {
    const tool = READ_TOOLS.find((item) => item.name === name)
    if (!tool) return { error: `Unknown tool: ${name}` }
    return tool.run({ firebaseApp, eventId }, args ?? {})
}

export type BuildProposalArgs = { firebaseApp: firebase.app.App; eventId: string; name: string; args: ToolArgs }

export const buildProposal = async ({
    firebaseApp,
    eventId,
    name,
    args,
}: BuildProposalArgs): Promise<BuildProposalResult> => {
    const tool = WRITE_TOOLS.find((item) => item.name === name)
    if (!tool) return { ok: false, error: `Unknown proposal tool: ${name}` }
    return tool.build({ firebaseApp, eventId }, args ?? {})
}
