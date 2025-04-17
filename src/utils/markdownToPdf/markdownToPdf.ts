import { jsPDF } from 'jspdf'
import { marked } from 'marked'
import type { Token } from 'marked'
import { Margins, DestinationAnnotation, LinkAnnotation } from './types'
import { addLinksToPage } from './pageUtils'
import { generateTableOfContents } from './tocUtils'
import { handleList } from './handlers/listHandler'
import { handleBlockquote } from './handlers/blockquoteHandler'
import { handleCode } from './handlers/codeHandler'
import { handleHr } from './handlers/hrHandler'
import { processLinkAnnotations } from './processLinkAnnotations'
import { handleHeading } from './handlers/headingHandler'
import { handleParagraph } from './handlers/paragraphHandler'

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
    let hasTocPlaceholder = false
    let tocPlaceholderPosition = -1

    // First pass: collect TOC entries and calculate positions
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

        // Check for TOC placeholder in paragraphs
        if (token.type === 'paragraph' && (token as any).text === '[TOC]') {
            hasTocPlaceholder = true
            tocPlaceholderPosition = i
        }

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

    // Generate TOC if needed
    let tocLinkAnnotations: LinkAnnotation[] = []

    if (tocEntries.length > 0) {
        if (hasTocPlaceholder) {
            // Skip TOC generation at the beginning if we have a TOC placeholder,
            // reset position to start rendering content from the top of page 1.
            currentY = margins.top
            currentPage = 1
        }
    }

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

        // If we've reached the TOC placeholder, generate the TOC here
        if (i === tocPlaceholderPosition) {
            tocLinkAnnotations = generateTableOfContents(doc, tocEntries, margins, currentY)

            // Calculate the height of the TOC
            const tocHeight =
                tocEntries.length * 6 + // Each TOC entry height
                10 // Separator line margin

            // Adjust current Y position
            currentY += tocHeight
            continue // Skip the TOC placeholder token
        }

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
                break
            }

            case 'paragraph': {
                // Skip [TOC] paragraph
                if ((token as any).text === '[TOC]') {
                    break
                }

                result = await handleParagraph(doc, token as any, margins, currentY, currentPage, maxLineWidth)
                currentY = result.newY
                currentPage = result.newPage
                linkAnnotations.push(...result.linkAnnotations)
                break
            }

            case 'list': {
                result = handleList(doc, token as any, margins, currentY, currentPage, maxLineWidth)
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

    addLinksToPage(doc, processedAnnotations, currentPage)

    return doc.output('blob')
}
