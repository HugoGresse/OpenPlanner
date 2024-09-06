import { getVideosLast72Hours, initYoutube, updateVideo, updateVideoThumbnail } from './youtubeAPI.js'
import fs from 'fs'
import axios from 'axios'
import path from 'path'
import { PromisePool } from '@supercharge/promise-pool'

const GLADIA_KEY_PATH = path.resolve(process.env.HOME, '.credentials', 'gladia_api.key')
const OPENAI_KEY_PATH = path.resolve(process.env.HOME, '.credentials', 'openai_api.key')
const POLLING_INTERVAL = 5000 // 5 seconds
const CONCURRENT_JOBS = 10
const PLAYLIST_ID = 'replace-me'

// This whole is here to generate subtitles for a youtube video
// using Gladia & ChatGPT. It won't upload subtitles to youtube
// but only export SRT files into `out_srt` directory.
//
// Configuration:
//  - Create a file containing gladia API key in ~/.credentials/gladia_api.key
//  - Create a file containing chatgpt API key in ~/.credentials/openai_api.key
//  - Ensure you have youtube credentials for API in ~/.credentials/youtube.credentials.json
//  - Ensure you have client_secret.json file to bypass Oauth2 from youtube
//  - Update const variable PLAYLIST_ID in this script with one containing all videos
//
// Notes:
//  - Videos & the playlist MUST not be in private, in "non-visible" at least
//  - You change the concurrency to better follow what's happening
//  - If any SRT or keywords are already generated, they won't be recreated.

const getApiKey = (filePath) => {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Error: API key file not found at: ${filePath}`)
        console.log('🔄 Please create a file at the above location with your API key.')
        process.exit(1)
    }
    return fs.readFileSync(filePath, 'utf-8').trim()
}

const GLADIA_API_KEY = getApiKey(GLADIA_KEY_PATH)
const OPENAI_API_KEY = getApiKey(OPENAI_KEY_PATH)
const GLADIA_TRANSCRIPTION_ENDPOINT = 'https://api.gladia.io/v2/transcription'

const joinYoutubeAndOpenPlannerData = (youtubeVideos, openPlannerData) => {
    const videosWithOpenPlannerData = youtubeVideos.map((video) => {
        const videoTitle = video.snippet.title

        const session = openPlannerData.sessions.find(
            (session) => videoTitle.includes(session.title) || session.title.includes(videoTitle)
        )

        return {
            videoId: video.contentDetails.videoId,
            publishedAt: video.contentDetails.videoPublishedAt,
            session,
        }
    })

    const videosWithValidSession = videosWithOpenPlannerData.filter((video) => video.session)

    console.log(`ℹ️ Matching videos: ${videosWithValidSession.length}`)
    console.log(
        `ℹ️ Non matching video title or no speakers: ${videosWithOpenPlannerData
            .filter((video) => !video.session)
            .map((video) => video.snippet.title)
            .join(', ')}`
    )

    return videosWithValidSession
}

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
    const srtFilename = path.join(outSrtDir, `${video.videoId}.srt`)
    const jsonFilename = path.join(outKeywordsDir, `${video.videoId}.json`)

    // Check if subtitles and keywords already exist
    const srtExists = fs.existsSync(srtFilename)
    const keywordsExist = fs.existsSync(jsonFilename)
    let customVocabulary = []

    if (keywordsExist) {
        customVocabulary = JSON.parse(fs.readFileSync(jsonFilename))
        console.log(`ℹ️ Keywords JSON file already exists for video ID: ${video.videoId}, using existing keywords.`)
    } else {
        const keywords = await generateKeywords(video.session)
        if (keywords.length > 0) {
            saveKeywordsToJson(keywords, video.videoId)
            customVocabulary = keywords
            console.log(
                `✅ Generated and saved keywords for session title: ${video.session.title} (ID: ${video.videoId})`
            )
        }
    }

    if (srtExists) {
        console.log(`ℹ️ SRT file already exists for video ID: ${video.videoId}, skipping transcription...`)
        return
    }

    try {
        const audioUrl = `https://www.youtube.com/watch?v=${video.videoId}`
        console.log(`🚀 Initiating transcription for ${video.session.title} (ID: ${video.videoId})`)

        const transcriptionId = await getTranscriptionIdFromGladia(audioUrl, customVocabulary)

        if (transcriptionId == '') {
            return
        }
        console.log(`🚀 Awaiting transcription results for ${video.session.title} (ID: ${video.videoId})`)
        const subtitles = await getFullTranscriptionFromGladia(transcriptionId)

        saveSubtitlesToSrt(subtitles, srtFilename)
        console.log(`✅ Processed and saved SRT for ${video.session.title} (ID: ${video.videoId})`)
    } catch (error) {
        console.error(`❌ Failed to process video ID: ${video.videoId}`, error.message)
    }
}

const main = async () => {
    const { auth, channelId } = await initYoutube()
    const openPlannerFileName = 'openplanner.json'
    const openPlannerContent = JSON.parse(fs.readFileSync(openPlannerFileName))

    const videos = await getVideosLast72Hours(auth, channelId, PLAYLIST_ID)
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
