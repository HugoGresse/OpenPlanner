import { getVideosLast72Hours, initYoutube } from './youtubeAPI.js'
import fs from 'fs'

const main = async () => {
    const { auth, channelId } = await initYoutube()

    const playlistId = 'PLz7aCyCbFOu-5OE0ajDUVjlqBFq1y9XiQ'
    const openPlannerFileName = 'openplanner.json'
    const openPlannerContent = JSON.parse(fs.readFileSync(openPlannerFileName))

    const videos = await getVideosLast72Hours(auth, channelId, playlistId)

    console.log('Retrieved videos: ' + videos.length)

    // Check if all videos exist in OpenPlanner
    const videosWithOpenPlannerData = videos.map((video) => {
        const videoTitle = video.snippet.title

        // find session details in openplanner.json
        const session = openPlannerContent.sessions.find(
            (session) => videoTitle.includes(session.title) || session.title.includes(videoTitle)
        )

        return {
            ...video,
            session,
        }
    })
    const videosWithValidSession = videosWithOpenPlannerData.filter((video) => video.session)

    console.log('Matching videos: ' + videosWithValidSession.length)
    console.log(
        'Non matching video title: ' +
            videosWithOpenPlannerData.filter((video) => !video.session).map((video) => video.snippet.title)
    )
}

main()
