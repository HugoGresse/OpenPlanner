import { getVideosLast72Hours, initYoutube } from './utils/youtubeAPI.js'
import { joinYoutubeAndOpenPlannerData } from './utils/joinYoutubeAndOpenPlannerData.js'
import 'dotenv/config'
import { getOpenPlannerContent } from './utils/getOpenPlannerContent.js'
import { updateOpenPlannerSessions } from './utils/updateOpenPlannerSessions.js'

/**
 * This script use Youtube API and OpenPlanner API to add the youtube video link to the session on OpenPlanner directly.
 *
 * Pre-requisites:
 * - Upload videos to youtube with the same (title or id) as in OpenPlanner
 * - change the playlist id "playlistId" to the one you want to edit (create it on youtube first)
 * - get the full data from open planner as "openplanner.json" in scripts/openplanner.json
 * - get the `scripts/client_secret.json` from https://console.developers.google.com/
 * - node 20+
 *
 * Usage:
 * - cd scripts
 * - npm install
 * - node youtube/addVideoLinkToOpenPlannerFromYoutube.js
 *
 * Help:
 * - the youtube credential code looks like 4/0AcvDMrBXVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx in the url
 */

const main = async () => {
    const { auth, channelId } = await initYoutube()

    const playlistId = process.env.YOUTUBE_PLAYLIST_ID
    const openPlannerEventId = process.env.OPENPLANNER_EVENT_ID
    const openPlannerApiKey = process.env.OPENPLANNER_API_KEY
    const openPlannerApiUrl = process.env.OPENPLANNER_API_URL

    const openPlannerContent = await getOpenPlannerContent(openPlannerEventId)

    const videos = await getVideosLast72Hours(auth, channelId, playlistId)

    console.log('Retrieved videos: ' + videos.length)

    const videosWithValidSession = joinYoutubeAndOpenPlannerData(videos, openPlannerContent)

    console.log('Videos with valid session: ' + videosWithValidSession.length)

    const sessionIdsToYoutubeUrl = videosWithValidSession.map((video) => {
        return {
            sessionId: video.session.id,
            title: video.session.title,
            videoLink: `https://www.youtube.com/watch?v=${video.snippet.resourceId.videoId}`,
        }
    })

    for (const sessionIdToYoutubeUrl of sessionIdsToYoutubeUrl) {
        console.log('Updating session', sessionIdToYoutubeUrl.sessionId)
        await updateOpenPlannerSessions(openPlannerEventId, openPlannerApiKey, sessionIdToYoutubeUrl.sessionId, {
            title: sessionIdToYoutubeUrl.title,
            videoLink: sessionIdToYoutubeUrl.videoLink,
        })
    }
}

main()
