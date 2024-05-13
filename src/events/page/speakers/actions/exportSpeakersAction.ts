import { downloadJsonToXLSX } from '../../../../utils/downloadJsonToXLSX'
import { triggerJsonDownloadFromData } from '../../../../utils/triggerFileDownload'
import { Speaker } from '../../../../types'
import { CreateNotificationOption } from '../../../../context/SnackBarProvider'

export enum SpeakersExportType {
    EmailCommaSeparated = 'email-comma',
    AllXLSX = 'all',
    AllJson = 'all-json',
    DisplayedXLSX = 'displayed',
    DisplayedJson = 'displayed-json',
}

export const exportSpeakersAction = (
    speakers: Speaker[],
    displayedSpeakers: Speaker[],
    type: SpeakersExportType,
    createNotification: (message: string, options?: CreateNotificationOption) => void
) => {
    switch (type) {
        case SpeakersExportType.EmailCommaSeparated:
            const emails = speakers
                .map((s) => s.email)
                .filter(Boolean)
                .join(', ')
            navigator.clipboard.writeText(emails)
            createNotification('Emails copied to clipboard', { type: 'success' })
            break
        case SpeakersExportType.AllXLSX:
            downloadJsonToXLSX(speakers, 'speakers.xlsx')
            break
        case SpeakersExportType.AllJson:
            const json = JSON.stringify(speakers, null, 4)
            const fileName = 'speakers.json'
            triggerJsonDownloadFromData(json, fileName)
            break
        case SpeakersExportType.DisplayedXLSX:
            downloadJsonToXLSX(displayedSpeakers, 'speakers.xlsx')
            break
        case SpeakersExportType.DisplayedJson:
            const displayedJson = JSON.stringify(displayedSpeakers, null, 4)
            const displayedFileName = 'speakers.json'
            triggerJsonDownloadFromData(displayedJson, displayedFileName)
            break
        default:
            console.warn('Unknown type', type)
            break
    }
}
