import { jsPDF } from 'jspdf'
import { TocEntry, LinkAnnotation, Margins } from './types'

export const generateTableOfContents = (
    doc: jsPDF,
    tocEntries: TocEntry[],
    margins: Margins,
    currentY: number
): LinkAnnotation[] => {
    // Filter out h1 entries (level 1)
    const filteredTocEntries = tocEntries.filter((entry) => entry.level > 1)

    if (filteredTocEntries.length === 0) return []

    let tocY = margins.top
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    tocY += 10

    const tocLinkAnnotations: LinkAnnotation[] = []

    filteredTocEntries.forEach((entry: TocEntry) => {
        const indent = (entry.level - 1) * 5
        const tocLineHeight = 5

        // Set font based on heading level (level 2 is bold, others are normal)
        if (entry.level === 2) {
            doc.setFont('helvetica', 'bold')
        } else {
            doc.setFont('helvetica', 'normal')
        }
        doc.setFontSize(10)
        const tocText = entry.text.replace(/[*_~`]{1,2}/g, '')
        const textWidth = doc.getTextWidth(tocText)

        // Draw text (without underline)
        doc.text(tocText, margins.left + indent, tocY)

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

    tocY += 6
    doc.line(margins.left, tocY, doc.internal.pageSize.getWidth() - margins.right, tocY)

    return tocLinkAnnotations
}
