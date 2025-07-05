import { downloadJsonToXLSX } from '../../../../utils/downloadJsonToXLSX'
import { triggerJsonDownloadFromData } from '../../../../utils/triggerFileDownload'
import { Speaker } from '../../../../types'
import { CreateNotificationOption } from '../../../../context/SnackBarProvider'

export enum SpeakersExportType {
    EmailCommaSeparated = 'email-comma',
    AllXLSX = 'all',
    AllJson = 'all-json',
    AllCsv = 'all-csv',
    DisplayedXLSX = 'displayed',
    DisplayedJson = 'displayed-json',
    DisplayedCsv = 'displayed-csv',
}

const convertSpeakersToCsv = (speakers: Speaker[]): string => {
    const headers = ['Name', 'Email', 'Company', 'Note', 'ID']
    const rows = speakers.map((speaker) => [
        speaker.name || '',
        speaker.email || '',
        speaker.company || '',
        speaker.note || '',
        speaker.id || '',
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    return csvContent
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
        case SpeakersExportType.AllCsv:
            const csvContent = convertSpeakersToCsv(speakers)
            const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const csvUrl = URL.createObjectURL(csvBlob)
            const csvLink = document.createElement('a')
            csvLink.href = csvUrl
            csvLink.download = 'speakers.csv'
            csvLink.click()
            URL.revokeObjectURL(csvUrl)
            break
        case SpeakersExportType.DisplayedXLSX:
            downloadJsonToXLSX(displayedSpeakers, 'speakers.xlsx')
            break
        case SpeakersExportType.DisplayedJson:
            const displayedJson = JSON.stringify(displayedSpeakers, null, 4)
            const displayedFileName = 'speakers.json'
            triggerJsonDownloadFromData(displayedJson, displayedFileName)
            break
        case SpeakersExportType.DisplayedCsv:
            const displayedCsvContent = convertSpeakersToCsv(displayedSpeakers)
            const displayedCsvBlob = new Blob([displayedCsvContent], { type: 'text/csv;charset=utf-8;' })
            const displayedCsvUrl = URL.createObjectURL(displayedCsvBlob)
            const displayedCsvLink = document.createElement('a')
            displayedCsvLink.href = displayedCsvUrl
            displayedCsvLink.download = 'speakers.csv'
            displayedCsvLink.click()
            URL.revokeObjectURL(displayedCsvUrl)
            break
        default:
            console.warn('Unknown type', type)
            break
    }
}
