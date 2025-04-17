import { jsPDF } from 'jspdf'
import type { Token } from 'marked'
import { LinkAnnotation, Margins } from '../types'
import { checkAddPage } from '../pageUtils'

// Define a type for inline tokens
interface InlineToken {
    type: 'text' | 'strong' | 'em' | 'del' | 'link' | 'codespan' | 'image' // Added 'image' just in case, though unlikely in lists directly
    text: string
    href?: string
    // Image related properties (less likely needed directly here, but for consistency)
    src?: string
    alt?: string
    // Raw might be useful for debugging or specific cases
    raw?: string
    tokens?: InlineToken[] // For nested structures like links or emphasis
}

// Interface for tracking text segments with their formatting
interface FormattedSegment {
    text: string
    type: InlineToken['type']
    href?: string
    // src?: string // Removed src/alt as image handling is separate
    // alt?: string
    needsSpaceBefore: boolean
    needsSpaceAfter: boolean
}

// Helper function to apply formatting based on token type
function applyFormatting(doc: jsPDF, type: InlineToken['type']): void {
    switch (type) {
        case 'strong':
            doc.setFont('helvetica', 'bold')
            break
        case 'em':
            doc.setFont('helvetica', 'italic')
            break
        case 'del':
            // Strikethrough is handled during rendering
            doc.setFont('helvetica', 'normal')
            break
        case 'codespan':
            doc.setFont('courier', 'normal')
            break
        case 'link':
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(0, 0, 255) // Blue for links
            break
        case 'image': // Should not happen within renderFormattedLine for lists
        case 'text':
        default:
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(0, 0, 0)
    }
}

// Helper function to reset formatting to default
function resetFormatting(doc: jsPDF): void {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
}

// Helper function to render a formatted line with multiple segments
// Adapted slightly for list context (startX, availableWidth)
function renderFormattedLine(
    doc: jsPDF,
    segments: FormattedSegment[],
    startX: number,
    y: number,
    lineHeight: number,
    pageNum: number,
    linkAnnotations: LinkAnnotation[]
): number {
    // Returns the width rendered
    let currentX = startX
    let totalWidth = 0 // Track the width of this line

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        const prevSegment = i > 0 ? segments[i - 1] : null

        applyFormatting(doc, segment.type)

        // Add spacing based on flags (simplified from paragraph)
        if (segment.needsSpaceBefore && i > 0) {
            const spaceWidth = doc.getTextWidth(' ') * 0.4 // Consistent spacing
            currentX += spaceWidth
            totalWidth += spaceWidth
        }

        const segmentText = segment.text
        const segmentWidth = doc.getTextWidth(segmentText)

        // Render the text
        doc.text(segmentText, currentX, y)

        // Add link annotation if needed
        if (segment.type === 'link' && segment.href) {
            const isInternal = segment.href.startsWith('#')
            const destHeadRef = isInternal ? segment.href.substring(1) : undefined

            linkAnnotations.push({
                page: pageNum,
                x: currentX,
                y: y - lineHeight, // Annotation y is typically top of the line
                w: segmentWidth,
                h: lineHeight,
                url: segment.href,
                isInternal,
                destHeadRef,
                fromType: 'list', // Mark source as list
            })
        }

        // Apply strikethrough if deleted text
        if (segment.type === 'del') {
            const lineY = y - lineHeight / 4 // Adjust strikethrough position slightly
            doc.line(currentX, lineY, currentX + segmentWidth, lineY)
        }

        currentX += segmentWidth
        totalWidth += segmentWidth

        // Add space after if needed (simplified)
        if (segment.needsSpaceAfter && i < segments.length - 1) {
            const spaceWidth = doc.getTextWidth(' ') * 0.4
            currentX += spaceWidth
            totalWidth += spaceWidth
        }

        resetFormatting(doc)
    }
    return totalWidth // Return the actual rendered width
}

// Define a more specific type for list items based on the example
interface ListItemToken {
    type: 'list_item'
    raw: string
    task: boolean
    loose: boolean
    text: string // The text content of the item, potentially with markdown
    tokens: Token[] // Nested tokens representing the inline structure
}

// Define a type for a list token (consistent with marked)
interface ListToken {
    type: 'list'
    ordered: boolean
    start?: number | '' | undefined // For ordered lists
    loose: boolean
    items: ListItemToken[]
}

// Recursive function to handle lists and sub-lists
export const handleList = (
    doc: jsPDF,
    token: ListToken, // Use the more specific ListToken type
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number,
    indentationLevel: number = 0, // Added indentation level
    linkAnnotations: LinkAnnotation[] = [] // Pass link annotations down
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const lineHeight = 5
    const indentWidth = 10 // Width for each indentation level
    const baseIndent = margins.left + indentationLevel * indentWidth

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    let currentLineY = currentY
    let currentPageNum = currentPage

    token.items.forEach((item: ListItemToken, index: number) => {
        let itemPageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
        currentLineY = itemPageCheck.newY
        currentPageNum = itemPageCheck.newPage

        // Determine prefix based on order and level
        const prefix = token.ordered ? `${index + 1}. ` : '- '
        const prefixWidth = doc.getTextWidth(prefix)
        const prefixX = baseIndent
        const contentStartX = prefixX + prefixWidth
        const availableContentWidth = maxLineWidth - (contentStartX - margins.left)

        // Render the prefix for the current item
        doc.text(prefix, prefixX, currentLineY)

        let firstLineOfItem = true // Track if we are on the first line of the item content

        // Process tokens *within* the list item
        item.tokens.forEach((itemContentToken: Token) => {
            // Handle nested lists recursively
            if (itemContentToken.type === 'list') {
                const listResult = handleList(
                    doc,
                    itemContentToken as ListToken, // Cast to specific type
                    margins,
                    currentLineY,
                    currentPageNum,
                    maxLineWidth,
                    indentationLevel + 1, // Increase indentation
                    linkAnnotations
                )
                currentLineY = listResult.newY
                currentPageNum = listResult.newPage
                // linkAnnotations are managed directly in the passed array
                firstLineOfItem = false // A sublist was rendered
            } else if (itemContentToken.type === 'text' && (itemContentToken as any).tokens) {
                // Handle formatted text using the existing logic
                const inlineTokens = (itemContentToken as any).tokens as InlineToken[]

                // Normalize and create FormattedSegments (same logic as before)
                const formattedSegments: FormattedSegment[] = []
                for (let i = 0; i < inlineTokens.length; i++) {
                    const currentInlineToken = inlineTokens[i]
                    if (!currentInlineToken.text && !['image'].includes(currentInlineToken.type)) continue

                    const needsSpaceBefore =
                        i > 0 && !inlineTokens[i - 1].raw?.endsWith(' ') && !currentInlineToken.raw?.startsWith(' ')
                    const needsSpaceAfter =
                        i < inlineTokens.length - 1 &&
                        !currentInlineToken.raw?.endsWith(' ') &&
                        !inlineTokens[i + 1].raw?.startsWith(' ')

                    const lastSegment = formattedSegments[formattedSegments.length - 1]
                    if (
                        lastSegment &&
                        lastSegment.type === currentInlineToken.type &&
                        (lastSegment.type !== 'link' || lastSegment.href === currentInlineToken.href) &&
                        !needsSpaceBefore
                    ) {
                        lastSegment.text += currentInlineToken.text
                        lastSegment.needsSpaceAfter = needsSpaceAfter
                    } else {
                        formattedSegments.push({
                            text: currentInlineToken.text || '',
                            type: currentInlineToken.type,
                            href: currentInlineToken.href,
                            needsSpaceBefore: needsSpaceBefore && formattedSegments.length > 0,
                            needsSpaceAfter: needsSpaceAfter,
                        })
                    }
                }

                // Render the formatted segments line by line
                let lineSegments: FormattedSegment[] = []
                let currentLineWidth = 0

                for (let i = 0; i < formattedSegments.length; i++) {
                    const segment = formattedSegments[i]
                    // Split considering spaces for accurate wrapping
                    const words = segment.text.split(/(\s+)|(?=[.,;:!?])|(?<=[.,;:!?])/).filter(Boolean)

                    // Apply space before this segment if needed
                    if (segment.needsSpaceBefore && currentLineWidth > 0) {
                        applyFormatting(doc, 'text')
                        const spaceWidth = doc.getTextWidth(' ') * 0.4
                        resetFormatting(doc)
                        if (currentLineWidth + spaceWidth <= availableContentWidth) {
                            if (lineSegments.length > 0) lineSegments[lineSegments.length - 1].needsSpaceAfter = true
                            currentLineWidth += spaceWidth
                        } else {
                            // Not enough space for the leading space, break line
                            renderFormattedLine(
                                doc,
                                lineSegments,
                                contentStartX,
                                currentLineY,
                                lineHeight,
                                currentPageNum,
                                linkAnnotations
                            )
                            currentLineY += lineHeight
                            const lineCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
                            currentLineY = lineCheck.newY
                            currentPageNum = lineCheck.newPage
                            lineSegments = []
                            currentLineWidth = 0
                            // Render indent marker for wrapped line (optional, could also just indent text)
                            // doc.text('...', prefixX, currentLineY); // Example marker
                        }
                    }

                    for (let j = 0; j < words.length; j++) {
                        const word = words[j]
                        const isWhitespace = /^\s+$/.test(word)

                        applyFormatting(doc, segment.type)
                        const wordWidth = doc.getTextWidth(word)
                        resetFormatting(doc)

                        // Check if word fits (consider it's the first word on the line slightly differently)
                        const effectiveLineWidth = currentLineWidth > 0 ? currentLineWidth : 0
                        const checkWidth =
                            effectiveLineWidth + (effectiveLineWidth > 0 ? doc.getTextWidth(' ') * 0.4 : 0) + wordWidth

                        if (currentLineWidth > 0 && checkWidth > availableContentWidth) {
                            // Word doesn't fit, render current line
                            renderFormattedLine(
                                doc,
                                lineSegments,
                                contentStartX,
                                currentLineY,
                                lineHeight,
                                currentPageNum,
                                linkAnnotations
                            )
                            currentLineY += lineHeight
                            const lineCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
                            currentLineY = lineCheck.newY
                            currentPageNum = lineCheck.newPage

                            // Start new line with this word
                            lineSegments = []
                            currentLineWidth = 0
                            firstLineOfItem = false // No longer the first line

                            // Add the word that didn't fit, unless it's only whitespace
                            if (!isWhitespace) {
                                lineSegments.push({
                                    ...segment,
                                    text: word,
                                    needsSpaceBefore: false,
                                    needsSpaceAfter: false,
                                })
                                currentLineWidth += wordWidth
                            }
                        } else {
                            // Word fits or is the first word
                            if (!isWhitespace) {
                                if (
                                    lineSegments.length > 0 &&
                                    lineSegments[lineSegments.length - 1].type === segment.type &&
                                    (segment.type !== 'link' ||
                                        lineSegments[lineSegments.length - 1].href === segment.href)
                                ) {
                                    if (currentLineWidth > 0)
                                        lineSegments[lineSegments.length - 1].text +=
                                            (segment.needsSpaceBefore ? ' ' : '') + word
                                    // Add space if needed
                                    else lineSegments[lineSegments.length - 1].text += word
                                } else {
                                    lineSegments.push({
                                        ...segment,
                                        text: word,
                                        needsSpaceBefore: false,
                                        needsSpaceAfter: j === words.length - 1 ? segment.needsSpaceAfter : false,
                                    })
                                }
                                currentLineWidth += (currentLineWidth > 0 ? doc.getTextWidth(' ') * 0.4 : 0) + wordWidth // Account for implicit space
                            } else if (currentLineWidth > 0) {
                                // Handle explicit whitespace
                                if (lineSegments.length > 0) lineSegments[lineSegments.length - 1].text += word // Append whitespace
                                currentLineWidth += wordWidth
                            }
                        }

                        // Simplified: Add space after based on original segment flag (might need refinement)
                        if (j === words.length - 1 && segment.needsSpaceAfter && currentLineWidth > 0) {
                            applyFormatting(doc, 'text')
                            const spaceWidth = doc.getTextWidth(' ') * 0.4
                            resetFormatting(doc)
                            if (currentLineWidth + spaceWidth <= availableContentWidth) {
                                if (lineSegments.length > 0) lineSegments[lineSegments.length - 1].text += ' '
                                currentLineWidth += spaceWidth
                            }
                        }
                    }
                }

                // Render any remaining segments in the last line for this text token
                if (lineSegments.length > 0) {
                    renderFormattedLine(
                        doc,
                        lineSegments,
                        contentStartX,
                        currentLineY,
                        lineHeight,
                        currentPageNum,
                        linkAnnotations
                    )
                    currentLineY += lineHeight
                    firstLineOfItem = false // Rendered content
                }
            } else if (itemContentToken.type === 'text') {
                // Handle simple, unformatted text within a list item
                const simpleText = itemContentToken.raw || ''
                const lines = doc.splitTextToSize(simpleText.trim(), availableContentWidth)

                lines.forEach((line: string, lineIndex: number) => {
                    // Don't re-render prefix for simple text lines after the first
                    const lineX = contentStartX
                    const lineCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
                    currentLineY = lineCheck.newY
                    currentPageNum = lineCheck.newPage
                    doc.text(line, lineX, currentLineY)
                    currentLineY += lineHeight
                    firstLineOfItem = false // Rendered content
                })
            } else {
                // Handle other potential token types like 'space', 'codespan', 'br', etc. if necessary
                // console.log('Unhandled token type in list item:', itemContentToken.type);
                if (itemContentToken.type === 'space') {
                    // Usually handled by adjacent text tokens, but might need explicit handling if isolated
                    // Advance Y slightly maybe? Or ignore?
                } else if (itemContentToken.type === 'br') {
                    currentLineY += lineHeight // Treat <br> as a line break
                    firstLineOfItem = false
                }
            }
        })

        // Add spacing after the item if it's a 'loose' list
        if (token.loose) {
            currentLineY += lineHeight * 0.5 // Add half line height spacing
        }
    })

    return {
        newY: currentLineY, // Return the final Y position after processing all items
        newPage: currentPageNum,
        linkAnnotations,
    }
}
