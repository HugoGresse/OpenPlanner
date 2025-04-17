import { jsPDF } from 'jspdf'
import { LinkAnnotation, Margins } from '../types'
import { checkAddPage } from '../pageUtils'

export const handleHr = (
    doc: jsPDF,
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const lineHeight = 5
    const pageCheck = checkAddPage(doc, currentY, lineHeight, margins, currentPage)

    doc.setLineWidth(0.5)
    doc.line(margins.left, pageCheck.newY, margins.left + maxLineWidth, pageCheck.newY)

    return {
        newY: pageCheck.newY + lineHeight,
        newPage: pageCheck.newPage,
        linkAnnotations: [],
    }
}
