import { jsPDF } from 'jspdf'
import { LinkAnnotation, Margins } from './types'

export const addLinksToPage = (pdfDoc: jsPDF, links: LinkAnnotation[], pageNum: number): void => {
    const originalPage = (pdfDoc.internal as any).getCurrentPageInfo().pageNumber
    links.forEach((link: LinkAnnotation) => {
        const targetPage = link.page || pageNum
        pdfDoc.setPage(targetPage)
        if (link.url) {
            pdfDoc.link(link.x, link.y, link.w, link.h, { url: link.url })
        } else if (link.destPage !== undefined && link.destY !== undefined) {
            pdfDoc.link(link.x, link.y, link.w, link.h, { pageNumber: link.destPage, top: link.destY })
        }
    })
    pdfDoc.setPage(originalPage)
}

export const checkAddPage = (
    doc: jsPDF,
    currentY: number,
    neededHeight: number,
    margins: Margins,
    currentPage: number
): { addedPage: boolean; newY: number; newPage: number } => {
    if (currentY + neededHeight > doc.internal.pageSize.getHeight() - margins.bottom) {
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
