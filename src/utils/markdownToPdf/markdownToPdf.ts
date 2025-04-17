import { jsPDF } from 'jspdf'
import { marked } from 'marked'
import type { Token } from 'marked'
import { Margins, DestinationAnnotation, LinkAnnotation } from './types'
import { addLinksToPage } from './pageUtils'
import { generateTableOfContents } from './tocUtils'
import { handleHeading, handleParagraph, handleList, handleBlockquote, handleCode, handleHr } from './handlers'
import { processLinkAnnotations } from './processLinkAnnotations'

/**
 * Generates a PDF from Markdown content with a Table of Contents and links.
 * @param {string} markdownContent The markdown string.
 * @returns {Promise<Blob>} A Promise resolving to the PDF Blob.
 */
export async function markdownToPdf(markdownContent: string): Promise<Blob> {
    const doc = new jsPDF()
    const tokens = marked.lexer(markdownContent)

    const margins: Margins = { top: 20, bottom: 20, left: 20, right: 20 }
    const maxLineWidth = doc.internal.pageSize.getWidth() - margins.left - margins.right
    let currentY = margins.top
    let currentPage = 1
    const tocEntries: { text: string; level: number; page: number; y: number }[] = []
    const destinationAnnotations: DestinationAnnotation[] = []
    const linkAnnotations: LinkAnnotation[] = []

    // First pass: collect TOC entries and calculate their positions
    for (const token of tokens) {
        if (token.type === 'heading') {
            const fontSize = Math.max(12, 24 - (token as any).depth * 2)
            const lineHeight = fontSize / 2
            const pageCheck = { newY: currentY, newPage: currentPage }

            tocEntries.push({
                text: (token as any).text,
                level: (token as any).depth,
                page: pageCheck.newPage,
                y: pageCheck.newY,
            })

            currentY += lineHeight + 2
        }
    }

    // Generate TOC at the beginning
    const tocLinkAnnotations = generateTableOfContents(doc, tocEntries, margins, currentY)

    // Calculate the height of the TOC
    const tocHeight =
        margins.top + // Initial margin
        16 + // Title height
        10 + // Title bottom margin
        tocEntries.length * 6 + // Each TOC entry height
        10 + // Separator line margin
        1 + // Separator line height
        10 // Bottom margin after separator

    // Set the starting position for content after the TOC
    currentY = tocHeight
    currentPage = doc.internal.pages.length

    // Second pass: render content
    let currentHeading: { text: string; level: number } | undefined

    for (const token of tokens) {
        let result
        switch (token.type) {
            case 'heading': {
                result = handleHeading(
                    doc,
                    token as Token & { type: 'heading'; depth: number; text: string },
                    margins,
                    currentY,
                    currentPage,
                    tocEntries
                )
                currentY = result.newY
                currentPage = result.newPage

                // Add destination annotation for the heading
                destinationAnnotations.push(result.destinationAnnotation)

                // Update current heading context
                currentHeading = {
                    text: (token as any).text,
                    level: (token as any).depth,
                }
                break
            }

            case 'paragraph': {
                result = handleParagraph(
                    doc,
                    token as Token & { type: 'paragraph'; raw: string },
                    margins,
                    currentY,
                    currentPage,
                    maxLineWidth,
                    currentHeading
                )
                currentY = result.newY
                currentPage = result.newPage
                linkAnnotations.push(...result.linkAnnotations)
                break
            }

            case 'list': {
                result = handleList(
                    doc,
                    token as Token & { type: 'list'; ordered: boolean; items: { text: string }[] },
                    margins,
                    currentY,
                    currentPage,
                    maxLineWidth
                )
                currentY = result.newY
                currentPage = result.newPage
                linkAnnotations.push(...result.linkAnnotations)
                break
            }

            case 'blockquote': {
                result = handleBlockquote(
                    doc,
                    token as Token & { type: 'blockquote'; text: string },
                    margins,
                    currentY,
                    currentPage,
                    maxLineWidth
                )
                currentY = result.newY
                currentPage = result.newPage
                linkAnnotations.push(...result.linkAnnotations)
                break
            }

            case 'code': {
                result = handleCode(
                    doc,
                    token as Token & { type: 'code'; text: string },
                    margins,
                    currentY,
                    currentPage,
                    maxLineWidth
                )
                currentY = result.newY
                currentPage = result.newPage
                linkAnnotations.push(...result.linkAnnotations)
                break
            }

            case 'hr': {
                result = handleHr(doc, margins, currentY, currentPage, maxLineWidth)
                currentY = result.newY
                currentPage = result.newPage
                linkAnnotations.push(...result.linkAnnotations)
                break
            }

            case 'space': {
                currentY += 5
                break
            }

            default:
                break
        }
    }

    // Process all link annotations to find and update matching destinations
    const processedAnnotations = processLinkAnnotations(tocLinkAnnotations, linkAnnotations, destinationAnnotations)
    console.log(processedAnnotations)

    // Add all links at the end
    // addLinksToPage(doc, processedAnnotations, currentPage)

    return doc.output('blob')
}
