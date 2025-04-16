import { jsPDF } from 'jspdf'
import { LinkAnnotation, Margins } from './types'

export const addLinksToPage = (pdfDoc: jsPDF, links: LinkAnnotation[], pageNum: number): void => {
    const originalPage = (pdfDoc.internal as any).getCurrentPageInfo().pageNumber
    links.forEach((link: LinkAnnotation) => {
        // For TOC links, we need to add them to page 1
        // For content links, we use the provided page number
        const targetPage = link.page === 1 ? 1 : pageNum
        pdfDoc.setPage(targetPage)
        if (link.url) {
            pdfDoc.link(link.x, link.y, link.w, link.h, { url: link.url })
        } else if (link.destPage !== undefined && link.destY !== undefined) {
            pdfDoc.link(link.x, link.y, link.w, link.h, { pageNumber: link.destPage, y: link.destY })
        }
    })
    pdfDoc.setPage(originalPage)
}

export const checkAddPage = (
    doc: jsPDF,
    currentY: number,
    neededHeight: number,
    margins: Margins,
    linkAnnotations: LinkAnnotation[],
    currentPage: number
): { addedPage: boolean; newY: number; newPage: number } => {
    if (currentY + neededHeight > doc.internal.pageSize.getHeight() - margins.bottom) {
        // Add links to current page before adding a new one
        if (linkAnnotations.length > 0) {
            addLinksToPage(doc, linkAnnotations, currentPage)
            linkAnnotations.length = 0
        }

        // Add new page and reset position
        doc.addPage()
        return {
            addedPage: true,
            newY: margins.top,
            newPage: currentPage + 1,
        }
    }
    return {
        addedPage: false,
        newY: currentY,
        newPage: currentPage,
    }
}
