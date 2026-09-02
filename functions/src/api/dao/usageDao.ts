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

interface LogRow {
    date: string
    eventId: string
    bytes: number
}

// Downloads and parses the hourly usage-log CSVs of the last `dayCount` days.
// Throws when the log bucket is unreachable; callers translate that into
// an "unavailable" reply.
const collectLogRows = async (firebaseApp: firebase.app.App, dayCount: number): Promise<LogRow[]> => {
    const logBucket = firebaseApp.storage().bucket(getUsageLogBucketName())

    const dayKeys: string[] = []
    for (let dayOffset = 0; dayOffset < dayCount; dayOffset++) {
        const day = new Date(Date.now() - dayOffset * 24 * 3600 * 1000)
        dayKeys.push(
            `${day.getUTCFullYear()}_${String(day.getUTCMonth() + 1).padStart(2, '0')}_${String(
                day.getUTCDate()
            ).padStart(2, '0')}`
        )
    }

    const fileLists = await Promise.all(
        dayKeys.map((key) => logBucket.getFiles({ prefix: `usage-log_usage_${key}` }).then(([files]) => files))
    )

    const rows: LogRow[] = []
    await Promise.all(
        fileLists.flat().map(async (logFile) => {
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
                const objectName = columns[objectIndex] || ''
                const eventMatch = objectName.match(/^events\/([^/]+)\//)
                if (!eventMatch) continue
                rows.push({
                    date: dateKey.replace(/_/g, '-'),
                    eventId: eventMatch[1],
                    bytes: parseInt(columns[bytesIndex] || '0', 10) || 0,
                })
            }
        })
    )
    return rows
}

export interface GlobalUsageEvent {
    eventId: string
    storageBytes: number
    fileCount: number
    networkBytes: number
    networkRequests: number
}

export interface GlobalUsage {
    totalStorageBytes: number
    totalFileCount: number
    networkAvailable: boolean
    totalNetworkBytes: number
    networkDays: NetworkUsageDay[]
    events: GlobalUsageEvent[]
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

    // Aggregates the usage logs of the last `dayCount` days for one event:
    // bytes sent and request count, per day. Logs only exist from the moment
    // usage logging was enabled on the bucket.
    public static async getNetworkUsage(
        firebaseApp: firebase.app.App,
        eventId: string,
        dayCount: number = 7
    ): Promise<NetworkUsage> {
        let rows
        try {
            rows = await collectLogRows(firebaseApp, dayCount)
        } catch (error) {
            console.warn('usage logs unavailable', '' + error)
            return { available: false, days: [], totalBytes: 0 }
        }

        const perDay = new Map<string, NetworkUsageDay>()
        for (const row of rows) {
            if (row.eventId !== eventId) continue
            const day = perDay.get(row.date) || { date: row.date, bytes: 0, requests: 0 }
            day.bytes += row.bytes
            day.requests += 1
            perDay.set(row.date, day)
        }
        const days = [...perDay.values()].sort((a, b) => a.date.localeCompare(b.date))
        return {
            available: true,
            days,
            totalBytes: days.reduce((total, day) => total + day.bytes, 0),
        }
    }

    // Whole-bucket view for the super-admin screen: storage and network usage
    // of every event, plus network per day across all events.
    public static async getGlobalUsage(firebaseApp: firebase.app.App, dayCount: number = 7): Promise<GlobalUsage> {
        const bucket = firebaseApp.storage().bucket(getStorageBucketName())
        const [files] = await bucket.getFiles({ prefix: 'events/' })

        const perEvent = new Map<string, GlobalUsageEvent>()
        const eventOf = (eventId: string) => {
            const entry = perEvent.get(eventId) || {
                eventId,
                storageBytes: 0,
                fileCount: 0,
                networkBytes: 0,
                networkRequests: 0,
            }
            perEvent.set(eventId, entry)
            return entry
        }

        let totalStorageBytes = 0
        for (const file of files) {
            const eventMatch = file.name.match(/^events\/([^/]+)\//)
            if (!eventMatch) continue
            const sizeBytes = parseInt(String(file.metadata.size || 0), 10)
            const entry = eventOf(eventMatch[1])
            entry.storageBytes += sizeBytes
            entry.fileCount += 1
            totalStorageBytes += sizeBytes
        }

        let networkAvailable = true
        const perDay = new Map<string, NetworkUsageDay>()
        try {
            const rows = await collectLogRows(firebaseApp, dayCount)
            for (const row of rows) {
                const entry = eventOf(row.eventId)
                entry.networkBytes += row.bytes
                entry.networkRequests += 1
                const day = perDay.get(row.date) || { date: row.date, bytes: 0, requests: 0 }
                day.bytes += row.bytes
                day.requests += 1
                perDay.set(row.date, day)
            }
        } catch (error) {
            console.warn('usage logs unavailable', '' + error)
            networkAvailable = false
        }

        const networkDays = [...perDay.values()].sort((a, b) => a.date.localeCompare(b.date))
        return {
            totalStorageBytes,
            totalFileCount: files.length,
            networkAvailable,
            totalNetworkBytes: networkDays.reduce((total, day) => total + day.bytes, 0),
            networkDays,
            events: [...perEvent.values()].sort(
                (a, b) => b.networkBytes - a.networkBytes || b.storageBytes - a.storageBytes
            ),
        }
    }
}
