import { jsPDF } from 'jspdf'
import type { Token } from 'marked'
import { TocEntry, DestinationAnnotation, Margins } from '../types'
import { checkAddPage } from '../pageUtils'
import { parseInlineContent } from './inlineContentParser'

export const handleHeading = (
    doc: jsPDF,
    token: Token & { type: 'heading'; depth: number; text: string; tokens?: Token[] },
    margins: Margins,
    currentY: number,
    currentPage: number,
    tocEntries: TocEntry[]
): { newY: number; newPage: number; destinationAnnotation: DestinationAnnotation } => {
    const fontSize = Math.max(12, 34 - token.depth * 6)
    // Estimate line height based on font size for page check, actual height might vary with wrapping
    const estimatedLineHeight = fontSize / 2
    const pageCheck = checkAddPage(doc, currentY, estimatedLineHeight + 2, margins, currentPage)
    let yPos = pageCheck.newY
    const newPage = pageCheck.newPage

    doc.setFont('helvetica', 'bold') // Default heading style
    doc.setFontSize(fontSize)
    // Use the plain text for TOC
    tocEntries.push({ text: token.text, level: token.depth, page: newPage, y: yPos })

    // Use the inline content parser to render styled text
    const finalY = parseInlineContent(
        doc,
        token.tokens || [{ type: 'text', text: token.text }],
        margins.left,
        yPos,
        margins
    )

    doc.setFont('helvetica', 'normal') // Reset font style after heading
    doc.setFontSize(10)

    return {
        newY: finalY + 7, // Add 7 points padding after the heading baseline
        newPage: newPage,
        destinationAnnotation: {
            page: newPage,
            y: yPos, // Use the initial y position for the link target
            headingText: token.text,
            headingLevel: token.depth,
        },
    }
}
