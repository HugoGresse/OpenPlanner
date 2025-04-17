import { jsPDF } from 'jspdf'
import type { Token } from 'marked'
import { TocEntry, DestinationAnnotation, Margins } from '../types'
import { checkAddPage } from '../pageUtils'

export const handleHeading = (
    doc: jsPDF,
    token: Token & { type: 'heading'; depth: number; text: string },
    margins: Margins,
    currentY: number,
    currentPage: number,
    tocEntries: TocEntry[]
): { newY: number; newPage: number; destinationAnnotation: DestinationAnnotation } => {
    const fontSize = Math.max(12, 24 - token.depth * 2)
    const lineHeight = fontSize / 2
    const pageCheck = checkAddPage(doc, currentY, lineHeight + 2, margins, currentPage)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fontSize)
    tocEntries.push({ text: token.text, level: token.depth, page: pageCheck.newPage, y: pageCheck.newY })
    doc.text(token.text, margins.left, pageCheck.newY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    return {
        newY: pageCheck.newY + lineHeight + 2,
        newPage: pageCheck.newPage,
        destinationAnnotation: {
            page: pageCheck.newPage,
            y: pageCheck.newY,
            headingText: token.text,
            headingLevel: token.depth,
        },
    }
}
