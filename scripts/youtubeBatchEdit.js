import { getVideosLast72Hours, initYoutube, updateVideo, updateVideoThumbnail } from './youtubeAPI.js'
import fs from 'fs'

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
 * - Upload videos to youtube with the same title as in OpenPlanner
 * - Generate thumbnails using https://fill-my-slides.web.app/ (you can get the correct format by uncomenting the line in the main : "return formatFillMySlidesData(openPlannerContent)", then put them in the "miniature" folder on the scripts folder.
 * - change the playlist id "playlistId" to the one you want to edit (create it on youtube first)
 * - get the full data from open planner as "openplanner.json" in scripts/openplanner.json
 * - get the `scripts/client_secret.json` from https://console.developers.google.com/
 * - node 18
 *
 * Usage:
 * - cd scripts
 * - npm install
 * - node youtubeBatchEdit.js
 */

const joinYoutubeAndOpenPlannerData = (youtubeVideos, openPlannerData) => {
    // Check if all videos exist in OpenPlanner
    const videosWithOpenPlannerData = youtubeVideos.map((video) => {
        const videoTitle = video.snippet.title

        // find session details in openplanner.json
        const session = openPlannerData.sessions.find(
            (session) => videoTitle.includes(session.title) || session.title.includes(videoTitle)
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
            if (social.name === 'Linkedin') {
                return `https://linkedin.com/in/${accountName}`
            }
            if (social.name === 'GitHub') {
                return `https://github.com/${accountName}`
            }
        })[0]
        return `${speaker.name} - ${socialLink}`
    })

    const desc = session.abstract + '\n\n' + openPlannerContent.event.name

    return `${speakersText.join('\n')}\n${desc.replace(/<[^>]*>?/gm, '')}`
}

const formatFillMySlidesData = (openPlannerContent) => {
    const captedTrackIds = ['lamour', 'amphi-106', 'amphi-108']
    const keepedSessions = openPlannerContent.sessions.filter((session) => {
        return session.speakerIds.length > 0 && captedTrackIds.includes(session.trackId)
    })

    const result = keepedSessions
        .map((session) => {
            const speakers = session.speakerIds.map((speakerId) => {
                const speaker = openPlannerContent.speakers.find((speaker) => speaker.id === speakerId)
                return speaker.name
            })
            const speakersAvatar = session.speakerIds.map((speakerId) => {
                const speaker = openPlannerContent.speakers.find((speaker) => speaker.id === speakerId)
                return speaker.photoUrl
            })
            if (!speakers || speakers.length === 0) {
                return null
            }
            return {
                0: session.title,
                1: speakers.reverse().join(', '),
                2: speakersAvatar[0],
                3: speakersAvatar[1] || 'https://i.ibb.co/NyxKRgx/1280px-HD-transparent-picture.png',
            }
        })
        .filter((session) => !!session)
    console.log(JSON.stringify(result))
}

const main = async () => {
    const { auth, channelId } = await initYoutube()

    const playlistId = 'PLz7aCyCbFOu-5OE0ajDUVjlqBFq1y9XiQ'
    const videoCategoryId = '27' // use await listVideoCategories(auth)
    const openPlannerFileName = 'openplanner.json'
    const openPlannerContent = JSON.parse(fs.readFileSync(openPlannerFileName))

    // Generate thumbnails using https://fill-my-slides.web.app/
    // return formatFillMySlidesData(openPlannerContent)

    const videos = await getVideosLast72Hours(auth, channelId, playlistId)

    console.log('Retrieved videos: ' + videos.length)

    return

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
        }).name

        const updateModel = {
            description: video.description,
            categoryId: videoCategoryId,
            defaultLanguage: 'fr',
            tags: ['sunnytech', tagBasedOnOpenPlannerCategory],
            recordingDetails: {
                recordingDate: video.session.dateStart,
            },
        }

        const videoId = video.snippet.resourceId.videoId
        const result = await updateVideo(auth, videoId, video.snippet.title, updateModel)
        if (result) {
            console.log('Updated video: ' + video.snippet.title)
        }
    }

    // Update video thumbnails
    let i = 0
    const videosWithValidSessionAndDescriptionOrderedFromOpenPlannerData = videosWithValidSessionAndDescription.sort(
        (a, b) => {
            // order by order of index in its respective array in openplanner.json
            const aIndex = openPlannerContent.sessions.findIndex((session) => session.id === a.session.id)
            const bIndex = openPlannerContent.sessions.findIndex((session) => session.id === b.session.id)

            if (aIndex === -1 || bIndex === -1) {
                return 0
            }
            return aIndex - bIndex
        }
    )

    for (const video of videosWithValidSessionAndDescriptionOrderedFromOpenPlannerData) {
        let thumbnailPath = `./miniature/${i}.png`

        const videoId = video.snippet.resourceId.videoId
        const result = await updateVideoThumbnail(auth, videoId, thumbnailPath)
        if (result) {
            console.log('Updated video thumbnail: ' + video.snippet.title)
        }
        i++
    }
}

main()
