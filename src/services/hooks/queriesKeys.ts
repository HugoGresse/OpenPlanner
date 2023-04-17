export const speakersKeys = {
    all: (eventId: string) => ['speakers', eventId],
    map: (eventId: string) => ['speakersMap', eventId],
    single: (eventId: string, speakerId: string) => ['speaker', eventId, speakerId],
}

export const sessionsKeys = {
    all: (eventId: string) => ['sessions', eventId],
    allWithSpeakers: (eventId: string) => ['sessionsWithSpeakers', eventId],
}

export const sponsorKeys = {
    all: (eventId: string) => ['sponsors', eventId],
}
