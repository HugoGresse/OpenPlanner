import { jsPDF } from 'jspdf'
import { marked } from 'marked'
import type { Token } from 'marked'
import { TocEntry, LinkAnnotation, Margins } from './types'
import { checkAddPage } from './pageUtils'

export const handleHeading = (
    doc: jsPDF,
    token: Token & { type: 'heading'; depth: number; text: string },
    margins: Margins,
    currentY: number,
    currentPage: number,
    tocEntries: TocEntry[]
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const fontSize = Math.max(12, 24 - token.depth * 2)
    const lineHeight = fontSize / 2
    const pageCheck = checkAddPage(doc, currentY, lineHeight + 2, margins, [], currentPage)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(fontSize)
    tocEntries.push({ text: token.text, level: token.depth, page: pageCheck.newPage, y: pageCheck.newY })
    doc.text(token.text, margins.left, pageCheck.newY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)

    return {
        newY: pageCheck.newY + lineHeight + 2,
        newPage: pageCheck.newPage,
        linkAnnotations: [],
    }
}

export const handleParagraph = (
    doc: jsPDF,
    token: Token & { type: 'paragraph'; raw: string },
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const lineHeight = 5
    let pageCheck = checkAddPage(doc, currentY, lineHeight, margins, [], currentPage)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const paragraphText = token.raw.replace(/<[^>]*>?/gm, '')
    const lines = doc.splitTextToSize(paragraphText, maxLineWidth)

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let currentLineY = pageCheck.newY
    let currentPageNum = pageCheck.newPage
    const linkAnnotations: LinkAnnotation[] = []

    lines.forEach((line: string) => {
        pageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, linkAnnotations, currentPageNum)
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
                linkAnnotations.push({
                    page: currentPageNum,
                    x: margins.left + textBeforeWidth,
                    y: currentLineY - lineHeight,
                    w: linkTextWidth,
                    h: lineHeight,
                    url: linkUrl,
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
        const pageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, linkAnnotations, currentPageNum)
        currentLineY = pageCheck.newY
        currentPageNum = pageCheck.newPage

        const prefix = token.ordered ? `${index + 1}. ` : '* '
        const itemText = item.text
        const lines = doc.splitTextToSize(prefix + itemText, maxLineWidth - 5)

        lines.forEach((line: string) => {
            const lineCheck = checkAddPage(doc, currentLineY, lineHeight, margins, linkAnnotations, currentPageNum)
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

export const handleBlockquote = (
    doc: jsPDF,
    token: Token & { type: 'blockquote'; text: string },
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const lineHeight = 5
    let pageCheck = checkAddPage(doc, currentY, lineHeight + 4, margins, [], currentPage)

    doc.setDrawColor(200)
    doc.setLineWidth(0.5)
    doc.line(
        margins.left,
        pageCheck.newY - lineHeight / 2,
        margins.left,
        pageCheck.newY + lineHeight * doc.splitTextToSize(token.text, maxLineWidth - 5).length
    )

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    const quoteLines = doc.splitTextToSize(token.text, maxLineWidth - 5)

    let currentLineY = pageCheck.newY
    let currentPageNum = pageCheck.newPage
    const linkAnnotations: LinkAnnotation[] = []

    quoteLines.forEach((line: string) => {
        pageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, linkAnnotations, currentPageNum)
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

    let pageCheck = checkAddPage(doc, currentY, codeBlockHeight + 4, margins, [], currentPage)

    doc.setFont('courier', 'normal')
    doc.setFontSize(9)
    doc.setFillColor(240, 240, 240)

    doc.rect(margins.left, pageCheck.newY - lineHeight + 1, maxLineWidth, codeBlockHeight, 'F')

    let currentLineY = pageCheck.newY
    let currentPageNum = pageCheck.newPage
    const linkAnnotations: LinkAnnotation[] = []

    codeLines.forEach((line: string) => {
        pageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, linkAnnotations, currentPageNum)
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

export const handleHr = (
    doc: jsPDF,
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const lineHeight = 5
    const pageCheck = checkAddPage(doc, currentY, lineHeight, margins, [], currentPage)

    doc.setLineWidth(0.5)
    doc.line(margins.left, pageCheck.newY, margins.left + maxLineWidth, pageCheck.newY)

    return {
        newY: pageCheck.newY + lineHeight,
        newPage: pageCheck.newPage,
        linkAnnotations: [],
    }
}
