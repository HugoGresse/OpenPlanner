import { EventSourceInput } from '@fullcalendar/core'
import { utils, writeFile } from 'xlsx-js-style'
import { FullCalendarSlotLabelInterval } from '../FullCalendarBase'
import { convertTableToXLSX } from './htmlToExcel'

type Resource = {
    id: string
    title: string
    order: number
}

type Events = {
    title: string
    id: string
    start: string
    end: string
    resourceId: string
    backgroundColor: string
}

export const convertFullCalendarToExcel = (
    events: EventSourceInput | Events[],
    slotLabelInterval = '00:15',
    resources: Resource[]
) => {
    const html = convertFullCalendarToHtml(events, slotLabelInterval, resources)

    const workbook = convertTableToXLSX(html)
    writeFile(workbook, 'fileName.xlsx')
}

const getRow = (time: Date, endTime: Date, resources: Resource[], eventsArray: Events[]) => {
    const row = document.createElement('tr')
    const timeCell = document.createElement('td')
    timeCell.textContent =
        time.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        }) +
        ' - ' +
        endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    row.appendChild(timeCell)

    resources.forEach((resource) => {
        const cell = document.createElement('td')
        const event = eventsArray.find(
            (e) => e.resourceId === resource.id && new Date(e.start) <= time && new Date(e.end) > time
        )
        if (event) {
            cell.textContent = event.title
            cell.style.backgroundColor = event.backgroundColor
        }
        row.appendChild(cell)
    })

    return row
}

export const convertFullCalendarToHtml = (
    events: EventSourceInput | Events[],
    slotLabelInterval = FullCalendarSlotLabelInterval,
    resources: Resource[]
) => {
    const table = document.createElement('table')
    const thead = document.createElement('thead')
    const tbody = document.createElement('tbody')

    const headerRow = document.createElement('tr')
    const emptyHeaderCell = document.createElement('th')
    headerRow.appendChild(emptyHeaderCell)
    resources.sort((a, b) => a.order - b.order)
    resources.forEach((resource) => {
        const headerCell = document.createElement('th')
        headerCell.textContent = resource.title
        headerRow.appendChild(headerCell)
    })
    thead.appendChild(headerRow)
    table.appendChild(thead)

    // Create table body
    const eventsArrayBase = events as Events[]
    const eventsArrayAllDay = eventsArrayBase.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    // Day1
    const eventsArray = eventsArrayAllDay.filter(
        (e) => new Date(e.start).getDate() === new Date(eventsArrayAllDay[0].start).getDate()
    )

    const startTime = new Date(eventsArray[0].start)
    const endTime = new Date(eventsArray[eventsArray.length - 1].end)

    const slotDuration = parseInt(slotLabelInterval.split(':')[1], 10)

    let currentTime = new Date(startTime)

    while (currentTime <= endTime) {
        const row = getRow(currentTime, new Date(currentTime.getTime() + slotDuration * 60000), resources, eventsArray)

        // check if row cell are identical to last row, if so, update the last row first cell end time
        const lastChildCells = tbody.lastChild?.childNodes
        const rowCells = row.childNodes
        // compare all cells except the first one
        let identical = true
        for (let i = 1; i < rowCells.length; i++) {
            if (lastChildCells && lastChildCells[i].textContent !== rowCells[i].textContent) {
                identical = false
                break
            }
        }
        if (identical && lastChildCells) {
            const newFirstCellTextContent = rowCells[0].textContent!.split(' - ')[1]
            lastChildCells[0].textContent =
                lastChildCells[0].textContent!.split(' - ')[0] + ' - ' + newFirstCellTextContent
        } else {
            tbody.appendChild(row)
        }

        currentTime = new Date(currentTime.getTime() + slotDuration * 60000)
    }

    table.appendChild(tbody)

    return table
}
