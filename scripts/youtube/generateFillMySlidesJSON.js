import 'dotenv/config'
import { getOpenPlannerContent } from './utils/getOpenPlannerContent.js'

/**
 * This script use the OpenPlanner API to generate the JSON for the https://fill-my-slides.web.app app
 *
 * Pre-requisites:
 * - session have a videoLink (video URL) in OpenPlanner. See the script youtube/addVideoLinkToOpenPlannerFromYoutube.js
 *
 * Usage:
 * - cd scripts
 * - npm install
 * - node youtube/generateFillMySlidesJSON.js
 */

const main = async () => {
    const openPlannerEventId = process.env.OPENPLANNER_EVENT_ID

    const openPlannerContent = await getOpenPlannerContent(openPlannerEventId)

    const sessionsWithVideoLink = openPlannerContent.sessions.filter((session) => session.videoLink)
    console.log(
        'Sessions with video link: ' + sessionsWithVideoLink.length + ' / ' + openPlannerContent.sessions.length
    )

    const result = sessionsWithVideoLink
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
                imageId: session.id,
                0: session.title,
                1: speakers.reverse().join(', '),
                2: speakersAvatar[0] || 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Clear.gif',
                3: speakersAvatar[1] || 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Clear.gif',
            }
        })
        .filter((session) => !!session)
    console.log(JSON.stringify(result))
}

main()
