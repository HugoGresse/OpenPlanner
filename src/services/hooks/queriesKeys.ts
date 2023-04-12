export const speakersKeys = {
    all: (eventId: string) => ['speakers', eventId],
    map: (eventId: string) => ['speakersMap', eventId],
}

export const sessionsKeys = {
    all: (eventId: string) => ['sessions', eventId],
    allWithSpeakers: (eventId: string) => ['sessionsWithSpeakers', eventId],
}
