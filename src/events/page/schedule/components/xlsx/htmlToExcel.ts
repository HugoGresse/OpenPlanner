import { CellObject, utils, WorkSheet } from 'xlsx-js-style'

const rgbToHex = (tdElement: HTMLTableCellElement): string => {
    const rgb = tdElement.style.backgroundColor

    // Extract RGB values from the string
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)

    if (match) {
        const [_, r, g, b] = match

        // Convert RGB values to hex
        const toHex = (value: string) => {
            const hex = Number(value).toString(16)
            return hex.length === 1 ? '0' + hex : hex
        }

        return `${toHex(r)}${toHex(g)}${toHex(b)}`
    }

    return 'FFFFFF'
}

export const convertTableToExcelWorkSheet = (table: HTMLTableElement): WorkSheet => {
    const worksheet = utils.aoa_to_sheet([])

    const rows = table.rows
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const cells = row.cells
        const rowData = []

        for (let j = 0; j < cells.length; j++) {
            const cell = cells[j] as HTMLTableCellElement
            const cellValue = cell.innerText

            const cellObject: Partial<CellObject> = {
                v: cellValue,
                s: {
                    fill: {
                        fgColor: { rgb: rgbToHex(cell) },
                    },
                },
            }

            rowData.push(cellObject)
        }

        utils.sheet_add_aoa(worksheet, [rowData], { origin: -1 })
    }

    return worksheet
}
