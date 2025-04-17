import { jsPDF } from 'jspdf'
import type { Token } from 'marked'
import { LinkAnnotation, Margins } from '../types'

export const handleParagraph = (
    doc: jsPDF,
    token: Token & { type: 'paragraph'; raw: string },
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number,
    currentHeading?: { text: string; level: number }
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const lineHeight = 5
    let pageCheck = { newY: currentY, newPage: currentPage }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const paragraphText = token.raw.replace(/<[^>]*>?/gm, '')
    const lines = doc.splitTextToSize(paragraphText, maxLineWidth)

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let currentLineY = pageCheck.newY
    let currentPageNum = pageCheck.newPage
    const linkAnnotations: LinkAnnotation[] = []

    lines.forEach((line: string) => {
        pageCheck = { newY: currentLineY, newPage: currentPageNum }
        currentLineY = pageCheck.newY
        currentPageNum = pageCheck.newPage

        doc.text(line, margins.left, currentLineY)

        let match
        let tempLine = line
        let offset = 0
        while ((match = linkRegex.exec(token.raw)) !== null) {
            const linkText = match[1]
            const linkUrl = match[2]
            const startIndex = tempLine.indexOf(linkText, offset)

            if (startIndex !== -1) {
                const textBeforeWidth = doc.getTextWidth(tempLine.substring(0, startIndex))
                const linkTextWidth = doc.getTextWidth(linkText)

                // Check if it's an internal link (starts with #)
                const isInternal = linkUrl.startsWith('#')
                const destHeadRef = isInternal ? linkUrl.substring(1) : undefined

                linkAnnotations.push({
                    page: currentPageNum,
                    x: margins.left + textBeforeWidth,
                    y: currentLineY - lineHeight,
                    w: linkTextWidth,
                    h: lineHeight,
                    url: linkUrl,
                    isInternal,
                    destHeadRef,
                    fromType: 'paragraph',
                })
                offset = startIndex + linkText.length
            }
        }
        currentLineY += lineHeight
    })

    return {
        newY: currentLineY + 2,
        newPage: currentPageNum,
        linkAnnotations,
    }
}
