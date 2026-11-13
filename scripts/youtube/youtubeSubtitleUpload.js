import { getVideosFromPlaylist, initYoutube, uploadCaption } from './utils/youtubeAPI.js'
import fs from 'fs'
import path from 'path'
import { getOpenPlannerContent } from './utils/getOpenPlannerContent.js'
import { joinYoutubeAndOpenPlannerData } from './utils/joinYoutubeAndOpenPlannerData.js'
import 'dotenv/config'

/**
 * This script is used to update youtube video with the generated subtitles.
 * Each upload cost 400 quota out of 10000 a day, reset at midnight pacific time.
 */
const main = async () => {
    const { auth, channelId } = await initYoutube()

    const playlistId = process.env.YOUTUBE_PLAYLIST_ID
    const openPlannerEventId = process.env.OPENPLANNER_EVENT_ID
    const outSrtDir = './out_srt'

    // Video IDs to skip (e.g. already uploaded), passed as CLI args:
    // node youtube/youtubeSubtitleUpload.js <videoId1> <videoId2> ...
    const excludeIds = new Set(process.argv.slice(2))
    if (excludeIds.size > 0) {
        console.log(`ℹ️ Excluding ${excludeIds.size} already-uploaded video(s)`)
    }

    const openPlannerContent = await getOpenPlannerContent(openPlannerEventId)

    const videos = await getVideosFromPlaylist(auth, channelId, playlistId)
    console.log('ℹ️ Retrieved videos: ' + videos.length)

    const videosWithValidSession = joinYoutubeAndOpenPlannerData(videos, openPlannerContent)

    for (const video of videosWithValidSession) {
        const videoId = video.contentDetails.videoId
        const srtFilename = path.join(outSrtDir, `${videoId}.srt`)

        if (excludeIds.has(videoId)) {
            console.log(`⏭️ Skipping excluded video ID: ${videoId}`)
            continue
        }

        const srtExists = fs.existsSync(srtFilename)
        if (!srtExists) {
            console.log(`ℹ️ SRT file does not exist for video ID: ${videoId}, skipping upload...`)
            continue
        }
        try {
            await uploadCaption(auth, videoId, srtFilename, 'fr', 'French subtitles')
            console.log(`✅ Uploaded subtitles for video ID: ${videoId}`)
        } catch (err) {
            console.error(`❌ Failed to upload subtitles for video ID: ${videoId}`, err.message)
        }
    }

    console.log('🏁 Uploading subtitles to youtube done!')
}

main()
