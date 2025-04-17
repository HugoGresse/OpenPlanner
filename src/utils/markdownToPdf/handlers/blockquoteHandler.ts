import { jsPDF } from 'jspdf'
import type { Token } from 'marked'
import { LinkAnnotation, Margins } from '../types'
import { checkAddPage } from '../pageUtils'

export const handleBlockquote = (
    doc: jsPDF,
    token: Token & { type: 'blockquote'; text: string },
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const lineHeight = 5
    let pageCheck = checkAddPage(doc, currentY, lineHeight + 4, margins, currentPage)

    doc.setDrawColor(200)
    doc.setLineWidth(0.5)
    doc.line(
        margins.left,
        pageCheck.newY - lineHeight,
        margins.left,
        pageCheck.newY + lineHeight * doc.splitTextToSize(token.text, maxLineWidth - 5).length - lineHeight / 3
    )

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    const quoteLines = doc.splitTextToSize(token.text, maxLineWidth - 5)

    let currentLineY = pageCheck.newY
    let currentPageNum = pageCheck.newPage
    const linkAnnotations: LinkAnnotation[] = []

    quoteLines.forEach((line: string) => {
        pageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
        currentLineY = pageCheck.newY
        currentPageNum = pageCheck.newPage

        doc.text(line, margins.left + 5, currentLineY)
        currentLineY += lineHeight
    })

    doc.setFont('helvetica', 'normal')

    return {
        newY: currentLineY + 4,
        newPage: currentPageNum,
        linkAnnotations,
    }
}
