import { jsPDF } from 'jspdf'
import type { Token } from 'marked'
import { LinkAnnotation, Margins } from '../types'
import { checkAddPage } from '../pageUtils'

// Define a type for inline tokens
interface InlineToken {
    type: 'text' | 'strong' | 'em' | 'del' | 'link' | 'codespan'
    text: string
    href?: string
}

// Interface for tracking text segments with their formatting
interface FormattedSegment {
    text: string
    type: InlineToken['type']
    href?: string
    needsSpaceBefore: boolean
    needsSpaceAfter: boolean
}

export const handleParagraph = (
    doc: jsPDF,
    token: Token & { type: 'paragraph'; raw: string; tokens?: InlineToken[] },
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number,
    currentHeading?: { text: string; level: number }
): { newY: number; newPage: number; linkAnnotations: LinkAnnotation[] } => {
    const lineHeight = 5
    let pageCheck = { newY: currentY, newPage: currentPage }
    let currentLineY = pageCheck.newY
    let currentPageNum = pageCheck.newPage
    const linkAnnotations: LinkAnnotation[] = []

    // Default text settings
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Handle paragraph with inline formatting tokens
    if (token.tokens && token.tokens.length > 0) {
        // Normalize tokens to handle spacing properly
        const normalizedTokens: InlineToken[] = []

        // First normalize the tokens to handle whitespace properly
        for (let i = 0; i < token.tokens.length; i++) {
            const currentToken = token.tokens[i]
            const prevToken = i > 0 ? token.tokens[i - 1] : null
            const nextToken = i < token.tokens.length - 1 ? token.tokens[i + 1] : null

            // Skip empty tokens
            if (!currentToken.text) continue

            normalizedTokens.push({
                ...currentToken,
                text: currentToken.text,
            })
        }

        // Pre-process the normalized tokens to combine adjacent tokens of the same type
        const formattedSegments: FormattedSegment[] = []

        for (let i = 0; i < normalizedTokens.length; i++) {
            const inlineToken = normalizedTokens[i]
            const prevToken = i > 0 ? normalizedTokens[i - 1] : null
            const nextToken = i < normalizedTokens.length - 1 ? normalizedTokens[i + 1] : null

            // Skip empty text tokens
            if (!inlineToken.text.trim() && inlineToken.type === 'text') continue

            // Determine if we need spacing around this token
            const needsSpaceBefore =
                !!prevToken &&
                !prevToken.text.endsWith(' ') &&
                !inlineToken.text.startsWith(' ') &&
                prevToken.type !== inlineToken.type

            const needsSpaceAfter =
                !!nextToken &&
                !inlineToken.text.endsWith(' ') &&
                !nextToken.text.startsWith(' ') &&
                inlineToken.type !== nextToken.type

            // Special handling for bold text - always ensure extra space
            const isBoldTransition =
                (inlineToken.type === 'strong' && !!prevToken && prevToken.type !== 'strong') ||
                (inlineToken.type !== 'strong' && !!nextToken && nextToken.type === 'strong')

            // Check if we can merge with the previous segment of the same type
            const lastSegment = formattedSegments[formattedSegments.length - 1]
            if (
                lastSegment &&
                lastSegment.type === inlineToken.type &&
                (lastSegment.type !== 'link' || lastSegment.href === inlineToken.href) &&
                !needsSpaceBefore
            ) {
                lastSegment.text += inlineToken.text
                // Update space-after flag
                lastSegment.needsSpaceAfter = needsSpaceAfter || (isBoldTransition && inlineToken.type !== 'strong')
            } else {
                formattedSegments.push({
                    text: inlineToken.text,
                    type: inlineToken.type,
                    href: inlineToken.href,
                    needsSpaceBefore: needsSpaceBefore || (isBoldTransition && inlineToken.type === 'strong'),
                    needsSpaceAfter: needsSpaceAfter || (isBoldTransition && inlineToken.type !== 'strong'),
                })
            }
        }

        // Process the paragraph by forming lines
        let lineSegments: FormattedSegment[] = []
        let currentLineWidth = 0
        const availableWidth = maxLineWidth

        // Process each segment
        for (let i = 0; i < formattedSegments.length; i++) {
            const segment = formattedSegments[i]

            // Handle explicit spacing for formatting transitions
            // This adds actual visual space between differently formatted segments
            if (segment.needsSpaceBefore && currentLineWidth > 0) {
                // Add small but visible space for style transition
                // Use more space for transitions to/from bold text
                const spaceWidth = segment.type === 'strong' ? doc.getTextWidth(' ') * 0.6 : doc.getTextWidth(' ') * 0.4
                currentLineWidth += spaceWidth

                // If the previous segment on the current line exists and needs space after
                if (lineSegments.length > 0) {
                    const prevLineSegment = lineSegments[lineSegments.length - 1]
                    prevLineSegment.needsSpaceAfter = true
                }
            }

            // Split segment by words to handle wrapping
            const words = segment.text.split(/(\s+)/).filter(Boolean)

            for (let j = 0; j < words.length; j++) {
                const word = words[j]
                const isWhitespace = /^\s+$/.test(word)
                const isLastWord = j === words.length - 1

                // Always add whitespace unless it's at the beginning of a line
                if (isWhitespace) {
                    if (currentLineWidth > 0) {
                        // Add space to current segment if possible
                        if (
                            lineSegments.length > 0 &&
                            lineSegments[lineSegments.length - 1].type === segment.type &&
                            (segment.type !== 'link' || lineSegments[lineSegments.length - 1].href === segment.href)
                        ) {
                            lineSegments[lineSegments.length - 1].text += word
                        } else {
                            lineSegments.push({
                                ...segment,
                                text: word,
                                needsSpaceBefore: false,
                                needsSpaceAfter: false,
                            })
                        }

                        // Update line width
                        applyFormatting(doc, segment.type)
                        currentLineWidth += doc.getTextWidth(word)
                        resetFormatting(doc)
                    }
                    continue
                }

                // For regular words, check if they fit
                applyFormatting(doc, segment.type)
                const wordWidth = doc.getTextWidth(word)
                resetFormatting(doc)

                // Calculate additional width for spacing after this word if needed
                let additionalWidth = 0
                if (isLastWord && segment.needsSpaceAfter) {
                    additionalWidth =
                        segment.type === 'strong' ? doc.getTextWidth(' ') * 0.6 : doc.getTextWidth(' ') * 0.4
                }

                // If this word would exceed the line width, render the current line and start a new one
                if (currentLineWidth + wordWidth + additionalWidth > availableWidth && currentLineWidth > 0) {
                    // Render the current line
                    renderFormattedLine(
                        doc,
                        lineSegments,
                        margins.left,
                        currentLineY,
                        lineHeight,
                        currentPageNum,
                        linkAnnotations
                    )

                    // Move to next line
                    currentLineY += lineHeight
                    pageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
                    currentLineY = pageCheck.newY
                    currentPageNum = pageCheck.newPage

                    // Reset line tracking
                    const newSegment = {
                        ...segment,
                        text: word,
                        needsSpaceBefore: false,
                        needsSpaceAfter: isLastWord ? segment.needsSpaceAfter : false,
                    }
                    lineSegments = [newSegment]
                    applyFormatting(doc, segment.type)
                    currentLineWidth = wordWidth
                    resetFormatting(doc)
                } else {
                    // Add word to the current line
                    if (
                        lineSegments.length > 0 &&
                        lineSegments[lineSegments.length - 1].type === segment.type &&
                        (segment.type !== 'link' || lineSegments[lineSegments.length - 1].href === segment.href)
                    ) {
                        lineSegments[lineSegments.length - 1].text += word
                        // Update space-after flag for the last word
                        if (isLastWord) {
                            lineSegments[lineSegments.length - 1].needsSpaceAfter = segment.needsSpaceAfter
                        }
                    } else {
                        const newSegment = {
                            ...segment,
                            text: word,
                            needsSpaceBefore: false,
                            needsSpaceAfter: isLastWord ? segment.needsSpaceAfter : false,
                        }
                        lineSegments.push(newSegment)
                    }
                    currentLineWidth += wordWidth
                }
            }
        }

        // Render any remaining text
        if (lineSegments.length > 0) {
            renderFormattedLine(
                doc,
                lineSegments,
                margins.left,
                currentLineY,
                lineHeight,
                currentPageNum,
                linkAnnotations
            )
            currentLineY += lineHeight
        }
    } else {
        // Fallback to raw text processing
        const paragraphText = token.raw.replace(/<[^>]*>?/gm, '')
        const lines = doc.splitTextToSize(paragraphText, maxLineWidth)

        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

        lines.forEach((line: string) => {
            pageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
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

                    // Check if it's an internal link (starts with #)
                    const isInternal = linkUrl.startsWith('#')
                    const destHeadRef = isInternal ? linkUrl.substring(1) : undefined

                    linkAnnotations.push({
                        page: currentPageNum,
                        x: margins.left + textBeforeWidth,
                        y: currentLineY - lineHeight,
                        w: linkTextWidth,
                        h: lineHeight,
                        url: linkUrl,
                        isInternal,
                        destHeadRef,
                        fromType: 'paragraph',
                    })
                    offset = startIndex + linkText.length
                }
            }
            currentLineY += lineHeight
        })
    }

    return {
        newY: currentLineY + 2,
        newPage: currentPageNum,
        linkAnnotations,
    }
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
            doc.setFont('helvetica', 'normal')
            break
        case 'codespan':
            doc.setFont('courier', 'normal')
            break
        case 'link':
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(0, 0, 255) // Blue for links
            break
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
function renderFormattedLine(
    doc: jsPDF,
    segments: FormattedSegment[],
    startX: number,
    y: number,
    lineHeight: number,
    pageNum: number,
    linkAnnotations: LinkAnnotation[]
): void {
    let currentX = startX

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        const prevSegment = i > 0 ? segments[i - 1] : null

        // Apply formatting for current segment
        applyFormatting(doc, segment.type)

        // Add extra space between different formatting styles
        // This is especially important for transitions to/from bold text
        if (prevSegment && prevSegment.type !== segment.type) {
            // Add more spacing specifically around bold text
            if (segment.type === 'strong' || prevSegment.type === 'strong') {
                currentX += doc.getTextWidth(' ') * 0.6 // 60% of a space for bold transitions
            } else {
                currentX += doc.getTextWidth(' ') * 0.4 // 40% for other transitions
            }
        }

        // Render the text
        doc.text(segment.text, currentX, y)

        // Add link annotation if needed
        if (segment.type === 'link' && segment.href) {
            const isInternal = segment.href.startsWith('#')
            const destHeadRef = isInternal ? segment.href.substring(1) : undefined

            linkAnnotations.push({
                page: pageNum,
                x: currentX,
                y: y - lineHeight,
                w: doc.getTextWidth(segment.text),
                h: lineHeight,
                url: segment.href,
                isInternal,
                destHeadRef,
                fromType: 'paragraph',
            })
        }

        // Apply strikethrough if deleted text
        if (segment.type === 'del') {
            const textWidth = doc.getTextWidth(segment.text)
            doc.line(currentX, y - lineHeight / 5, currentX + textWidth, y - lineHeight / 5)
        }

        // Update current X position
        currentX += doc.getTextWidth(segment.text)

        // Add extra space after segment if needed
        if (segment.needsSpaceAfter) {
            if (segment.type === 'strong') {
                currentX += doc.getTextWidth(' ') * 0.6 // More space after bold
            } else {
                currentX += doc.getTextWidth(' ') * 0.4 // Standard space for other formats
            }
        }

        // Reset formatting
        resetFormatting(doc)
    }
}
