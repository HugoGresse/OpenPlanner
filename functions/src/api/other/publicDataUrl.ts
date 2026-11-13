import { Event } from '../../../../src/types'
import { unknownToDateTime } from './dateConverter'

// Public JSON URL versioned by the event's updatedAt: a new "Update website"
// changes updatedAt, so consumers get a new URL and every HTTP cache misses.
// Between deploys the URL is stable and the file is served from cache instead
// of billing storage egress on every page view.
export const publicDataUrl = (bucket: string, event: Event): string => {
    const version = event.updatedAt ? unknownToDateTime(event.updatedAt as any).toMillis() : 0
    return `https://storage.googleapis.com/${bucket}/${event.files?.public}?v=${version}`
}
