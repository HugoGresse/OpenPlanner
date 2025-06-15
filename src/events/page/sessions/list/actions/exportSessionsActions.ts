import { Session } from '../../../../../types'
import { triggerJsonDownloadFromData } from '../../../../../utils/triggerFileDownload'
import { downloadJsonToXLSX } from '../../../../../utils/downloadJsonToXLSX'
import { flattenObject } from '../../../../../utils/flattedObject'

export enum SessionsExportType {
    AllSessionsXLSX = 'All sessions (XLSX)',
    AllSessionsJson = 'All sessions (JSON)',
    DisplayedSessionsXLSX = 'Displayed sessions (XLSX)',
    DisplayedSessionsJson = 'Displayed sessions (JSON)',
    TeasingSessionsXLSX = 'Teasing data (XLSX, only displayed)',
    TeasingSessionsJson = 'Teasing data (JSON, only displayed)',
}

export const exportSessionsAction = (
    allSessions: Session[],
    displayedSessions: Session[],
    type: SessionsExportType,
    timezone?: string
) => {
    const addTimezone = (session: any) => ({ ...session, timezone: timezone || 'UTC' })
    const flattenAllSessions = allSessions.map((s) => flattenObject(s)).map(addTimezone)
    const flattedDisplayedSessions = displayedSessions.map((s) => flattenObject(s)).map(addTimezone)
    const teasingData = displayedSessions.map((s) => ({
        title: s.title,
        speakers: s.speakersData,
        start: s.dates?.start?.toISO() ?? '',
        teasingData: s.teasingPosts,
        teasingImage: s.teaserImageUrl,
        teasingVideo: s.teaserVideoUrl,
        timezone: timezone || 'UTC',
    }))

    switch (type) {
        case SessionsExportType.AllSessionsXLSX:
            downloadJsonToXLSX(flattenAllSessions, 'sessions.xlsx')
            break
        case SessionsExportType.AllSessionsJson:
            const json = JSON.stringify(allSessions.map(addTimezone), null, 4)
            const fileName = 'sessions.json'
            triggerJsonDownloadFromData(json, fileName)
            break
        case SessionsExportType.DisplayedSessionsXLSX:
            downloadJsonToXLSX(flattedDisplayedSessions, 'sessions.xlsx')
            break
        case SessionsExportType.DisplayedSessionsJson:
            const displayedJson = JSON.stringify(displayedSessions.map(addTimezone), null, 4)
            const displayedFileName = 'sessions.json'
            triggerJsonDownloadFromData(displayedJson, displayedFileName)
            break
        case SessionsExportType.TeasingSessionsXLSX:
            downloadJsonToXLSX(
                teasingData.map((s) => flattenObject(s)),
                'teasing-sessions.xlsx'
            )
            break
        case SessionsExportType.TeasingSessionsJson:
            const teasingJson = JSON.stringify(teasingData, null, 4)
            const teasingFileName = 'teasing-sessions.json'
            triggerJsonDownloadFromData(teasingJson, teasingFileName)
            break
        default:
            console.warn('Unknown type', type)
            break
    }
}
