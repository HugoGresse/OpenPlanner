import { getVideosFromPlaylist, initYoutube } from './utils/youtubeAPI.js'
import fs from 'fs'
import axios from 'axios'
import path from 'path'
import { PromisePool } from '@supercharge/promise-pool'
import { getOpenPlannerContent } from './utils/getOpenPlannerContent.js'
import { joinYoutubeAndOpenPlannerData } from './utils/joinYoutubeAndOpenPlannerData.js'
import 'dotenv/config'

const POLLING_INTERVAL = 5000 // 5 seconds
const CONCURRENT_JOBS = 5

// This whole is here to generate subtitles for a youtube video
// using Gladia & ChatGPT. It won't upload subtitles to youtube
// but only export SRT files into `out_srt` directory.
//
// Configuration:
//  - Fill the .env file with the following variables:
//    - GLADIA_API_KEY
//    - OPENAI_API_KEY
//    - YOUTUBE_PLAYLIST_ID
//    - OPENPLANNER_EVENT_ID
//  - Ensure you have youtube credentials for API in ~/.credentials/youtube.credentials.json
//  - Ensure you have client_secret.json file to bypass Oauth2 from youtube
//
// Notes:
//  - Videos & the playlist MUST not be in private, in "non-visible" at least
//  - You change the concurrency to better follow what's happening
//  - If any SRT or keywords are already generated, they won't be recreated.

const GLADIA_API_KEY = process.env.GLADIA_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!GLADIA_API_KEY || !OPENAI_API_KEY) {
    throw new Error('GLADIA_API_KEY and OPENAI_API_KEY must be set')
}

const GLADIA_TRANSCRIPTION_ENDPOINT = 'https://api.gladia.io/v2/transcription'

async function getTranscriptionIdFromGladia(audioUrl, customVocabulary) {
    const headers = {
        'Content-Type': 'application/json',
        'x-gladia-key': GLADIA_API_KEY,
    }

    const payload = {
        audio_url: audioUrl,
        subtitles: true,
        subtitles_config: {
            formats: ['srt'],
        },
        custom_vocabulary: customVocabulary,
    }

    let response = {}
    try {
        response = await axios.post(GLADIA_TRANSCRIPTION_ENDPOINT, payload, { headers })

        if (response.status !== 201) {
            console.error(`❌ Failed to initiate transcription for URL: ${audioUrl}`)
            console.error(response.data)
            throw new Error('Failed to initiate transcription')
        }

        const transcriptionId = response.data.id
        if (!transcriptionId) {
            throw new Error('Transcription ID not found in response')
        }

        return transcriptionId
    } catch (error) {
        console.error(`❌ Failed to initiate transcription for URL: ${audioUrl}: `, payload, error)
    }
}

function saveSubtitlesToSrt(subtitles, filename) {
    fs.writeFileSync(filename, subtitles)
}

async function getFullTranscriptionFromGladia(transcriptionId) {
    const headers = {
        'x-gladia-key': GLADIA_API_KEY,
    }

    let isCompleted = false
    let subtitles = null

    while (!isCompleted) {
        const response = await axios.get(`${GLADIA_TRANSCRIPTION_ENDPOINT}/${transcriptionId}`, { headers })

        if (response.status !== 200) {
            throw new Error('Failed to fetch full transcription')
        }

        if (response.data.status === 'done') {
            isCompleted = true
            subtitles = response.data.result.transcription.subtitles[0].subtitles
        } else {
            await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL))
        }
    }

    if (subtitles) {
        return subtitles
    }

    throw new Error('Subtitles not found in response')
}

async function generateKeywords(session) {
    const prompt = `Extract 10 technology-related keywords from the following abstract. Keywords shouldn't be french words, but rather technology names or methods. Give me a json list raw:\n\n${session.abstract}`
    let keywords = []
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 500,
                temperature: 0,
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            }
        )

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const rawKeywords = response.data.choices[0].message.content
            keywords = rawKeywords.replaceAll('`', '').replace('json', '')
            return JSON.parse(keywords)
        }

        throw new Error('No keywords found in response')
    } catch (error) {
        console.error(`❌ Error generating keywords for session: ${session.title}`, error.message, keywords)
        return keywords
    }
}

function saveKeywordsToJson(keywords, videoId) {
    const outKeywordsDir = './out_keywords'
    if (!fs.existsSync(outKeywordsDir)) {
        fs.mkdirSync(outKeywordsDir)
    }

    const jsonFilename = path.join(outKeywordsDir, `${videoId}.json`)
    fs.writeFileSync(jsonFilename, JSON.stringify(keywords, null, 2))
}

const processVideo = async (video, outSrtDir, outKeywordsDir) => {
    const videoId = video.contentDetails.videoId
    const srtFilename = path.join(outSrtDir, `${videoId}.srt`)
    const jsonFilename = path.join(outKeywordsDir, `${videoId}.json`)

    // Check if subtitles and keywords already exist
    const srtExists = fs.existsSync(srtFilename)
    const keywordsExist = fs.existsSync(jsonFilename)
    let customVocabulary = []

    if (keywordsExist) {
        // @ts-ignore
        customVocabulary = JSON.parse(fs.readFileSync(jsonFilename))
        console.log(`ℹ️ Keywords JSON file already exists for video ID: ${videoId}, using existing keywords.`)
    } else {
        console.log('Generating keywords for ' + video.session.title)
        const keywords = await generateKeywords(video.session)
        if (keywords.length > 0) {
            saveKeywordsToJson(keywords, videoId)
            customVocabulary = keywords
            console.log(`✅ Generated and saved keywords for session title: ${video.session.title} (ID: ${videoId})`)
        }
    }

    if (srtExists) {
        console.log(`ℹ️ SRT file already exists for video ID: ${videoId}, skipping transcription...`)
        return
    }

    try {
        const audioUrl = `https://www.youtube.com/watch?v=${videoId}`
        console.log(`🚀 Initiating transcription for ${video.session.title} (ID: ${videoId})`)

        const transcriptionId = await getTranscriptionIdFromGladia(audioUrl, customVocabulary)

        if (transcriptionId == '') {
            return
        }
        console.log(`🚀 Awaiting transcription results for ${video.session.title} (ID: ${videoId})`)
        const subtitles = await getFullTranscriptionFromGladia(transcriptionId)

        saveSubtitlesToSrt(subtitles, srtFilename)
        console.log(`✅ Processed and saved SRT for ${video.session.title} (ID: ${videoId})`)
    } catch (error) {
        console.error(`❌ Failed to process video ID: ${videoId}`, error.message)
    }
}

const main = async () => {
    const { auth, channelId } = await initYoutube()

    const playlistId = process.env.YOUTUBE_PLAYLIST_ID
    const openPlannerEventId = process.env.OPENPLANNER_EVENT_ID

    const openPlannerContent = await getOpenPlannerContent(openPlannerEventId)

    const videos = await getVideosFromPlaylist(auth, channelId, playlistId)
    console.log('ℹ️ Retrieved videos: ' + videos.length)

    const videosWithValidSession = joinYoutubeAndOpenPlannerData(videos, openPlannerContent)

    const outSrtDir = './out_srt'
    if (!fs.existsSync(outSrtDir)) {
        fs.mkdirSync(outSrtDir)
    }

    const outKeywordsDir = './out_keywords'
    if (!fs.existsSync(outKeywordsDir)) {
        fs.mkdirSync(outKeywordsDir)
    }

    await PromisePool.withConcurrency(CONCURRENT_JOBS)
        .for(videosWithValidSession)
        .process(async (video, index, pool) => {
            await processVideo(video, outSrtDir, outKeywordsDir)
        })

    console.log('🏁 Completed all video processing.')
}

main()
