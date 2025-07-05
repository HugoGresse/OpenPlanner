export const updateOpenPlannerSessions = async (openPlannerEventId, openPlannerApiKey, sessionId, dataToUpdate) => {
    const url = `https://api.openplanner.fr/v1/${openPlannerEventId}/sessions-speakers?apiKey=${openPlannerApiKey}`
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            speakers: [],
            sessions: [
                {
                    id: sessionId,
                    ...dataToUpdate,
                },
            ],
        }),
    })

    if (!response.ok) {
        throw new Error(
            `Failed to update session ${sessionId}: ${response.statusText} ${response.status} ${await response.text()}`
        )
    }

    const data = await response.json()

    if (!data.success) {
        throw new Error(`Failed to update session ${sessionId}: ${data.message}`)
    }

    return data
}
