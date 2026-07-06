export const joinYoutubeAndOpenPlannerData = (youtubeVideos, openPlannerData) => {
    // Check if all videos exist in OpenPlanner
    const videosWithOpenPlannerData = youtubeVideos.map((video) => {
        const videoTitle = video.snippet.title

        // find session details in openplanner.json. Match on the session id first (videos are now
        // often uploaded with the session id as their title), then fall back to title matching.
        const session =
            openPlannerData.sessions.find((session) => videoTitle === session.id) ||
            openPlannerData.sessions.find(
                (session) => session.title && (videoTitle.includes(session.title) || session.title.includes(videoTitle))
            )

        return {
            ...video,
            session,
            speakers:
                session && session.speakerIds
                    ? session.speakerIds.map((speakerId) => {
                          const speaker = openPlannerData.speakers.find((speaker) => speaker.id === speakerId)
                          return speaker
                      })
                    : [],
        }
    })
    const videosWithValidSession = videosWithOpenPlannerData.filter(
        (video) => video.session && video.speakers.length > 0
    )

    console.log('Matching videos: ' + videosWithValidSession.length)
    console.log(
        'Non matching video title or no speakers: ' +
            videosWithOpenPlannerData
                .filter((video) => !video.session || video.speakers.length === 0)
                .map((video) => video.snippet.title)
    )

    return videosWithValidSession
}
