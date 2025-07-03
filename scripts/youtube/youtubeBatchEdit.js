import { getVideosFromPlaylist, initYoutube, updateVideo, updateVideoThumbnail } from './utils/youtubeAPI.js'
import { joinYoutubeAndOpenPlannerData } from './utils/joinYoutubeAndOpenPlannerData.js'
import { getOpenPlannerContent } from './utils/getOpenPlannerContent.js'
import 'dotenv/config'

/**
 * This script allow for batch edit of youtube metadata (title, desc, tags, date, thumbnail).
 * The youtube video should be uploaded separately with the title matching the one from OpenPlanner.
 *
 * It can update:
 * - title
 * - description (it will format the author name + social links + abstract)
 * - tags
 * - recorded date
 * - thumbnail from thumnails generate using https://fill-my-slides.web.app/ or your own thumbnails, located in the "miniature" folder, with the file name being the index of the talk from openplanner.json
 *
 * Pre-requisites:
 * - Upload videos to youtube with the same (title or id) as in OpenPlanner
 * - Generate thumbnails using https://fill-my-slides.web.app/ (you can get the correct format by uncomenting the line in the main : "return formatFillMySlidesData(openPlannerContent)", then put them in the "miniature" folder on the scripts folder. Don't forget to set Two images as avatar for co-speakers cases and specify which track was filmed in the "captedTrackIds" array.
 * - change the playlist id "playlistId" to the one you want to edit (create it on youtube first)
 * - get the full data from open planner as "openplanner.json" in scripts/openplanner.json
 * - get the `scripts/client_secret.json` from https://console.developers.google.com/
 * - node 18
 *
 * Usage:
 * - cd scripts
 * - npm install
 * - node youtubeBatchEdit.js
 *
 * Help:
 * - the youtube credential code looks like 4/0AcvDMrBXVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx in the url
 */

const formatYoutubeDescription = (video, openPlannerContent) => {
    const { session, speakers } = video

    if (!session) {
        return null
    }

    const speakersText = speakers.map((speaker) => {
        const socialLink = speaker.socials.map((social) => {
            if (!social.link) {
                return ''
            }
            if (social.link.startsWith('http')) {
                return social.link
            }
            const accountName = social.link.replace('@', '')
            if (social.name === 'Twitter') {
                return `https://twitter.com/${accountName}`
            }
            if (social.name === 'X') {
                return `https://x.com/${accountName}`
            }
            if (social.name === 'Linkedin') {
                return `https://linkedin.com/in/${accountName}`
            }
            if (social.name === 'GitHub') {
                return `https://github.com/${accountName}`
            }
        })[0]
        if (!socialLink) {
            return speaker.name
        }
        return `${speaker.name} - ${socialLink}`
    })

    const desc = session.abstract + '\n\n' + openPlannerContent.event.name

    return `${speakersText.join('\n')}\n${desc.replace(/<[^>]*>?/gm, '')}`
}

const main = async () => {
    const { auth, channelId } = await initYoutube()

    const playlistId = process.env.YOUTUBE_PLAYLIST_ID
    const openPlannerEventId = process.env.OPENPLANNER_EVENT_ID

    const openPlannerContent = await getOpenPlannerContent(openPlannerEventId)
    const videoCategoryId = '27' // use await listVideoCategories(auth)

    const videos = await getVideosFromPlaylist(auth, channelId, playlistId)

    console.log('Retrieved videos: ' + videos.length)

    const videosWithValidSession = joinYoutubeAndOpenPlannerData(videos, openPlannerContent)

    const videosWithValidSessionAndDescription = videosWithValidSession
        .map((video) => {
            return {
                ...video,
                description: formatYoutubeDescription(video, openPlannerContent),
            }
        })
        .filter((video) => !!video)

    // Update video metadata
    for (const video of videosWithValidSessionAndDescription) {
        const tagBasedOnOpenPlannerCategory = openPlannerContent.event.categories.find((category) => {
            return category.id === video.session.categoryId
        })?.name

        const updateModel = {
            description: video.description,
            categoryId: videoCategoryId,
            defaultLanguage: 'fr',
            tags: ['sunnytech', tagBasedOnOpenPlannerCategory, 'sunnytech-2025'].filter(Boolean),
            recordingDetails: {
                recordingDate: video.session.dateStart,
            },
        }

        const videoId = video.snippet.resourceId.videoId
        const videoTitle =
            video.session.title.length > 100 ? video.session.title.slice(0, 95) + '...' : video.session.title
        if (video.session.title.length > 100) {
            console.log(
                ' ⚠️ Video title is too long and has been sliced: ' +
                    video.session.title +
                    ' (YT video id: ' +
                    videoId +
                    ')',
                video.session.videoLink
            )
        }
        const result = await updateVideo(auth, videoId, videoTitle, updateModel)
        if (result) {
            console.log('Updated video: ' + video.snippet.title)
        }
    }

    // Update video thumbnails
    for (const video of videosWithValidSessionAndDescription) {
        const thumbnailPath = `./miniature/${video.session.id}.png`
        const videoId = video.snippet.resourceId.videoId

        console.log('Updating video thumbnail for ' + video.session.title + ' (YT video id: ' + videoId + ')')

        const result = await updateVideoThumbnail(auth, videoId, thumbnailPath)
        if (result) {
            console.log('Updated video thumbnail: ' + video.snippet.title)
        }
    }
}

main()
