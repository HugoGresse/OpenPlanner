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
