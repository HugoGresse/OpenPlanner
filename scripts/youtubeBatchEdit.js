import { getVideosLast72Hours, initYoutube, updateVideo } from './youtubeAPI.js'
import fs from 'fs'

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
    const videosWithValidSession = videosWithOpenPlannerData.filter((video) => video.session)

    console.log('Matching videos: ' + videosWithValidSession.length)
    console.log(
        'Non matching video title: ' +
            videosWithOpenPlannerData.filter((video) => !video.session).map((video) => video.snippet.title)
    )

    return videosWithOpenPlannerData
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
    const result = openPlannerContent.sessions
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

    return formatFillMySlidesData(openPlannerContent)

    const videos = await getVideosLast72Hours(auth, channelId, playlistId)

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
        break
    }
}

main()
