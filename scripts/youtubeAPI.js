import fs from 'fs'
import readline from 'readline'
import { google } from 'googleapis'

var OAuth2 = google.auth.OAuth2

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/youtube']
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
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback)
        } else {
            oauth2Client.credentials = JSON.parse(token)
            callback(oauth2Client)
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
                part: 'snippet,contentDetails,statistics',
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

export const getVideosLast72Hours = async (auth, channelId, playlistId) => {
    // date for 3 days ago
    const date = new Date()
    date.setDate(date.getDate() - 3)
    const afterDate = date.toISOString()
    console.log(afterDate)

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

export const updateVideoThumbnail = async (auth, videoId, thumbnailPath) => {
    const service = google.youtube('v3')
    const response = await service.thumbnails.set({
        auth: auth,
        videoId: videoId,
        media: {
            mimeType: 'image/png',
            body: fs.createReadStream(thumbnailPath),
        },
    })
    return response.data
}
