import fs from 'fs'
import readline from 'readline'
import { Readable } from 'node:stream'
import sharp from 'sharp'
import { google } from 'googleapis'

var OAuth2 = google.auth.OAuth2

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtube.force-ssl']
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/'
var TOKEN_PATH = TOKEN_DIR + 'youtube.credentials.json'

export const initYoutube = () => {
    return new Promise((resolve, reject) => {
        // Load client secrets from a local file.
        fs.readFile('client_secret.json', function processClientSecrets(err, content) {
            if (err) {
                console.log('Error loading client secret file: ' + err)
                return
            }
            // Authorize a client with the loaded credentials, then call the YouTube API.
            authorize(JSON.parse(content), async (auth) => {
                const channelId = await getChannel(auth)
                resolve({ auth, channelId })
            })
        })
    })
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret
    var clientId = credentials.installed.client_id
    var redirectUrl = credentials.installed.redirect_uris[0]
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl)

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, async function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback)
            return
        }
        oauth2Client.credentials = JSON.parse(token)
        try {
            // Force a refresh now so an expired/revoked token (invalid_grant) fails here
            // instead of crashing mid-run, and re-authenticate cleanly.
            await oauth2Client.getAccessToken()
            callback(oauth2Client)
        } catch (refreshErr) {
            console.log(`⚠️ Stored YouTube token is invalid (${refreshErr?.message || refreshErr}). Re-authenticating…`)
            try {
                fs.unlinkSync(TOKEN_PATH)
            } catch {
                // token already gone, ignore
            }
            getNewToken(oauth2Client, callback)
        }
    })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // force a fresh refresh_token on every re-auth
        scope: SCOPES,
    })
    console.log('Authorize this app by visiting this url: ', authUrl)
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close()
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err)
                return
            }
            oauth2Client.credentials = token
            storeToken(token)
            callback(oauth2Client)
        })
    })
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR)
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) throw err
        console.log('Token stored to ' + TOKEN_PATH)
    })
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
const getChannel = async (auth) => {
    return new Promise((resolve, reject) => {
        var service = google.youtube('v3')
        service.channels.list(
            {
                auth: auth,
                part: ['snippet', 'contentDetails', 'statistics'],
                mine: true,
            },
            function (err, response) {
                if (err) {
                    console.log('The API returned an error: ' + err)
                    reject(err)
                    return
                }
                var channels = response.data.items
                if (channels.length == 0) {
                    console.log('No channel found.')
                } else {
                    console.log(
                        "This channel's ID is %s. Its title is '%s', and " + 'it has %s views.',
                        channels[0].id,
                        channels[0].snippet.title,
                        channels[0].statistics.viewCount
                    )
                }
                resolve(channels[0].id)
            }
        )
    })
}

export const getVideosFromPlaylist = async (auth, channelId, playlistId) => {
    var service = google.youtube('v3')

    // get all videos in playlist
    const playlistItems = await service.playlistItems.list({
        auth: auth,
        part: 'snippet,contentDetails',
        playlistId: playlistId,
        maxResults: 50,
    })

    return playlistItems.data.items
}

export const listVideoCategories = async (auth) => {
    var service = google.youtube('v3')
    const response = await service.videoCategories.list({
        auth: auth,
        part: 'snippet',
        regionCode: 'FR',
    })
    console.log(response.data.items)
    return response.data.items
}

export const updateVideo = async (auth, videoId, videoTitle, snippetData) => {
    var service = google.youtube('v3')
    const response = await service.videos.update({
        auth: auth,
        part: 'snippet',
        resource: {
            id: videoId,
            snippet: {
                title: videoTitle,
                ...snippetData,
            },
        },
    })
    if (response.data) {
        const response2 = await service.videos.update({
            auth: auth,
            part: 'recordingDetails',
            resource: {
                id: videoId,
                ...snippetData,
            },
        })
    }
    return response.data
}

export const updateVideoThumbnail = async (auth, videoId, thumbnailPath, maxRetries = 3) => {
    const service = google.youtube('v3')
    // Convert to PNG in memory so we always upload PNG regardless of the source format
    const pngBuffer = await sharp(thumbnailPath).png().toBuffer()

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await service.thumbnails.set({
                auth: auth,
                videoId: videoId,
                media: {
                    mimeType: 'image/png',
                    // recreate the stream on every attempt: a consumed/aborted stream cannot be reused
                    body: Readable.from(pngBuffer),
                },
            })
            return response.data
        } catch (error) {
            if (attempt === maxRetries) {
                throw error
            }
            const delayMs = 2000 * attempt
            console.log(
                `⚠️ Thumbnail upload failed for ${videoId} (attempt ${attempt}/${maxRetries}): ${
                    error.message
                }. Retrying in ${delayMs / 1000}s…`
            )
            await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
    }
}

// Upload SRT subtitles as captions to a YouTube video
export const uploadCaption = async (auth, videoId, srtPath, language = 'fr', name = 'French subtitles') => {
    const service = google.youtube('v3')
    const response = await service.captions.insert({
        auth: auth,
        part: 'snippet',
        resource: {
            snippet: {
                videoId: videoId,
                language: language,
                name: name,
            },
        },
        media: {
            mimeType: 'application/x-subrip',
            body: fs.createReadStream(srtPath),
        },
    })
    return response.data
}
