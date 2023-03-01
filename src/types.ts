export interface Track {
    id: string
    name: string
}
export interface Webhooks {
    lastAnswer: string
    url: string
}

export interface Event {
    id: string
    name: string
    owner: string
    scheduleVisible: boolean
    members: string[]
    dates: {
        start: Date
        end: Date
    }
    tracks: Track[]
    webhooks: Webhooks[]
}

export interface ConferenceHallEvent {
    id: string
    name: string
    organization: string // orgId
    conferenceDates: {
        start: Date
        end: Date
    }
}
export interface ConferenceHallOrganization {
    id: string
    name: string
}

export interface ConferenceHallProposal {
    id: string
    title: string
    level: string
    abstract: string
    state: ConferenceHallProposalState
    owner: string
    speakers: {
        [key: string]: boolean
    }
}
export enum ConferenceHallProposalState {
    submitted = 'submitted',
    accepted = 'accepted',
    backup = 'backup',
    rejected = 'rejected',
}
