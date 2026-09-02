import firebase from 'firebase-admin'
import { defineString } from 'firebase-functions/params'
import { getStorageBucketName } from './firebasePlugin'

export interface StorageUsage {
    totalBytes: number
    fileCount: number
    topFiles: { name: string; sizeBytes: number }[]
}

export interface NetworkUsageDay {
    date: string
    bytes: number
    requests: number
}

export interface NetworkUsage {
    available: boolean
    days: NetworkUsageDay[]
    totalBytes: number
}

const usageLogBucketParam = defineString('USAGE_LOG_BUCKET', {
    default: 'conferencecenterr-usage-logs',
    description: 'Bucket receiving the GCS usage logs of the main storage bucket',
})

const getUsageLogBucketName = () => {
    let fromParam = ''
    try {
        fromParam = usageLogBucketParam.value()
    } catch (error) {
        // params are only resolvable inside the Firebase runtime
    }
    return process.env.USAGE_LOG_BUCKET || fromParam || 'conferencecenterr-usage-logs'
}

export class UsageDao {
    // Sums every object stored under events/{eventId}/ in the main bucket
    public static async getStorageUsage(firebaseApp: firebase.app.App, eventId: string): Promise<StorageUsage> {
        const bucket = firebaseApp.storage().bucket(getStorageBucketName())
        const [files] = await bucket.getFiles({ prefix: `events/${eventId}/` })

        const sized = files.map((file) => ({
            name: file.name.replace(`events/${eventId}/`, ''),
            sizeBytes: parseInt(String(file.metadata.size || 0), 10),
        }))
        return {
            totalBytes: sized.reduce((total, file) => total + file.sizeBytes, 0),
            fileCount: sized.length,
            topFiles: sized.sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 10),
        }
    }

    // Aggregates the GCS usage logs (hourly CSVs) of the last `dayCount` days for
    // one event: bytes sent and request count, per day. Logs only exist from the
    // moment usage logging was enabled on the bucket.
    public static async getNetworkUsage(
        firebaseApp: firebase.app.App,
        eventId: string,
        dayCount: number = 7
    ): Promise<NetworkUsage> {
        const dayKeys: string[] = []
        for (let dayOffset = 0; dayOffset < dayCount; dayOffset++) {
            const day = new Date(Date.now() - dayOffset * 24 * 3600 * 1000)
            dayKeys.push(
                `${day.getUTCFullYear()}_${String(day.getUTCMonth() + 1).padStart(2, '0')}_${String(
                    day.getUTCDate()
                ).padStart(2, '0')}`
            )
        }

        const perDay = new Map<string, NetworkUsageDay>()
        try {
            const logBucket = firebaseApp.storage().bucket(getUsageLogBucketName())
            const fileLists = await Promise.all(
                dayKeys.map((key) => logBucket.getFiles({ prefix: `usage-log_usage_${key}` }).then(([f]) => f))
            )
            const logFiles = fileLists.flat()

            await Promise.all(
                logFiles.map(async (logFile) => {
                    const dateKey = (logFile.name.match(/usage_(\d{4}_\d{2}_\d{2})/) || [])[1]
                    if (!dateKey) return
                    const [content] = await logFile.download()
                    const lines = content.toString('utf8').split('\n').filter(Boolean)
                    if (lines.length < 2) return
                    const header = lines[0].split(',').map((column) => column.replace(/"/g, ''))
                    const objectIndex = header.indexOf('cs_object')
                    const bytesIndex = header.indexOf('sc_bytes')
                    if (objectIndex === -1 || bytesIndex === -1) return

                    for (const line of lines.slice(1)) {
                        const columns = line.split(',').map((column) => column.replace(/^"|"$/g, ''))
                        if (!columns[objectIndex]?.startsWith(`events/${eventId}/`)) continue
                        const date = dateKey.replace(/_/g, '-')
                        const day = perDay.get(date) || { date, bytes: 0, requests: 0 }
                        day.bytes += parseInt(columns[bytesIndex] || '0', 10) || 0
                        day.requests += 1
                        perDay.set(date, day)
                    }
                })
            )
        } catch (error) {
            console.warn('usage logs unavailable', '' + error)
            return { available: false, days: [], totalBytes: 0 }
        }

        const days = [...perDay.values()].sort((a, b) => a.date.localeCompare(b.date))
        return {
            available: true,
            days,
            totalBytes: days.reduce((total, day) => total + day.bytes, 0),
        }
    }
}
