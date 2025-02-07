import { Event, Session, Speaker } from '../../../../../../src/types'

export const generateOpenFeedbackJson = (event: Event, sessions: Session[], speaker: Speaker[]) => {
    const feedbackJson: {
        sessions: {
            [key: string]: any
        }
        speakers: {
            [key: string]: any
        }
    } = {
        sessions: {},
        speakers: {},
    }

    sessions.forEach((session) => {
        if (!session.showInFeedback) {
            return
        }

        const tags = []

        const categoryName = session.category
            ? event.categories.find((category) => category.id === session.category)?.name
            : []

        if (categoryName) {
            tags.push(categoryName)
        }

        feedbackJson.sessions[session.id] = {
            speakers: session.speakers,
            tags: tags,
            title: session.title,
            id: session.id,
            startTime: session.dates?.start?.toISO(),
            endTime: session.dates?.end?.toISO(),
            trackTitle: event.tracks.find((track) => track.id === session.trackId)?.name,
        }
    })

    speaker.forEach((speaker) => {
        feedbackJson.speakers[speaker.id] = {
            name: speaker.name,
            photoUrl: speaker.photoUrl,
            socials: speaker.socials,
            id: speaker.id,
        }
    })

    return feedbackJson
}
