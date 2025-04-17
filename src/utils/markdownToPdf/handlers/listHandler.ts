import { jsPDF } from 'jspdf'
import type { Token } from 'marked'
import { LinkAnnotation, Margins } from '../types'
import { checkAddPage } from '../pageUtils'

export const handleList = (
    doc: jsPDF,
    token: Token & { type: 'list'; ordered: boolean; items: { text: string }[] },
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const lineHeight = 5
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    let currentLineY = currentY
    let currentPageNum = currentPage
    const linkAnnotations: LinkAnnotation[] = []

    token.items.forEach((item: { text: string }, index: number) => {
        const pageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
        currentLineY = pageCheck.newY
        currentPageNum = pageCheck.newPage

        const prefix = token.ordered ? `${index + 1}. ` : '* '
        const itemText = item.text
        const lines = doc.splitTextToSize(prefix + itemText, maxLineWidth - 5)

        lines.forEach((line: string) => {
            const lineCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
            currentLineY = lineCheck.newY
            currentPageNum = lineCheck.newPage

            doc.text(line, margins.left + 5, currentLineY)
            currentLineY += lineHeight
        })
    })

    return {
        newY: currentLineY + 2,
        newPage: currentPageNum,
        linkAnnotations,
    }
}
