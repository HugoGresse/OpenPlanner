import { jsPDF } from 'jspdf'
import type { Token } from 'marked'
import { LinkAnnotation, Margins } from '../types'
import { checkAddPage } from '../pageUtils'

export const handleCode = (
    doc: jsPDF,
    token: Token & { type: 'code'; text: string },
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const lineHeight = 4.5
    const codeLines = token.text.split('\n')
    const codeBlockHeight = codeLines.length * lineHeight + 2

    let pageCheck = checkAddPage(doc, currentY, codeBlockHeight + 4, margins, currentPage)

    doc.setFont('courier', 'normal')
    doc.setFontSize(9)
    doc.setFillColor(240, 240, 240)

    doc.rect(margins.left, pageCheck.newY - lineHeight + 1, maxLineWidth, codeBlockHeight, 'F')

    let currentLineY = pageCheck.newY
    let currentPageNum = pageCheck.newPage
    const linkAnnotations: LinkAnnotation[] = []

    codeLines.forEach((line: string) => {
        pageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
        currentLineY = pageCheck.newY
        currentPageNum = pageCheck.newPage

        const displayLine = doc.splitTextToSize(line, maxLineWidth - 4)[0] || ''
        doc.text(displayLine, margins.left + 2, currentLineY)
        currentLineY += lineHeight
    })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    return {
        newY: currentLineY + 4,
        newPage: currentPageNum,
        linkAnnotations,
    }
}
