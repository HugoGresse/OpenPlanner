import { jsPDF } from 'jspdf'
import { TocEntry, LinkAnnotation, Margins } from './types'

export const generateTableOfContents = (
    doc: jsPDF,
    tocEntries: TocEntry[],
    margins: Margins,
    currentY: number
): LinkAnnotation[] => {
    if (tocEntries.length === 0) return []

    let tocY = margins.top
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('Table of Contents', margins.left, tocY)
    tocY += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const tocLinkAnnotations: LinkAnnotation[] = []

    tocEntries.forEach((entry: TocEntry) => {
        const indent = (entry.level - 1) * 5
        const tocLineHeight = 5

        const tocText = entry.text
        const textWidth = doc.getTextWidth(tocText)

        // Draw underlined text
        doc.text(tocText, margins.left + indent, tocY)
        doc.setDrawColor(0, 0, 0)
        doc.line(margins.left + indent, tocY + 1, margins.left + indent + textWidth, tocY + 1)

        tocLinkAnnotations.push({
            page: 1, // TOC is always on page 1
            x: margins.left + indent,
            y: tocY - tocLineHeight,
            w: textWidth,
            h: tocLineHeight,
            isInternal: true,
            destHeadRef: entry.text,
        })

        tocY += tocLineHeight + 1
    })

    // Add a separator line after the TOC
    tocY += 10
    doc.line(margins.left, tocY, doc.internal.pageSize.getWidth() - margins.right, tocY)
    tocY += 10

    // Adjust the Y position for all entries since we added the TOC
    tocEntries.forEach((entry) => {
        entry.y += tocY
    })

    return tocLinkAnnotations
}
