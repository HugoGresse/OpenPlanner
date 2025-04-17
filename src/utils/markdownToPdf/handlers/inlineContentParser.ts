import { jsPDF } from 'jspdf'
import type { Token } from 'marked'
import { Margins } from '../types'

// Basic styles mapping
const styleMap: { [key: string]: string } = {
    strong: 'bold',
    em: 'italic',
    // Add more mappings if needed (e.g., 'codespan')
}

/**
 * Parses and renders an array of inline markdown tokens (like text, strong, em, del).
 * Handles basic styling and automatic line wrapping within margins.
 *
 * @param doc The jsPDF instance.
 * @param tokens The array of marked inline tokens.
 * @param x The starting X coordinate.
 * @param y The starting Y coordinate.
 * @param margins Page margins.
 * @returns The final Y coordinate after rendering the content.
 */
export const parseInlineContent = (doc: jsPDF, tokens: Token[], x: number, y: number, margins: Margins): number => {
    let currentX = x
    let currentY = y
    const pageHeight = doc.internal.pageSize.height
    const availableWidth = doc.internal.pageSize.width - margins.left - margins.right
    const currentFontSize = doc.getFontSize()
    const lineHeight = doc.getLineHeight() // Use jsPDF's calculated line height
    let currentFontStyle = doc.getFont().fontStyle || 'normal' // Track current style

    const applyStyle = (style: string) => {
        doc.setFont('helvetica', style) // Assuming helvetica is the base font
        currentFontStyle = style
    }

    tokens.forEach((token) => {
        if (!('text' in token) || typeof token.text !== 'string') {
            console.warn('Skipping non-text token in inline parser:', token)
            return // Skip tokens without text content for now
        }

        let text = token.text
        const tokenType = token.type as keyof typeof styleMap | 'text' | 'del'

        // Apply specific styles
        const styleToApply = styleMap[tokenType] || 'normal'
        applyStyle(styleToApply)

        // Handle strikethrough manually
        const isStrikethrough = tokenType === 'del'

        // Process text segment by segment (words) for wrapping
        const words = text.split(/(\s+)/) // Split by space, keeping spaces
        words.forEach((word) => {
            if (!word) return // Skip empty strings resulting from split
            const wordWidth = doc.getTextWidth(word)

            // Check if word fits on the current line
            if (currentX + wordWidth > margins.left + availableWidth) {
                // Move to the next line
                currentY += lineHeight
                currentX = margins.left

                // Check for page break
                if (currentY > pageHeight - margins.bottom) {
                    doc.addPage()
                    currentY = margins.top
                    // Re-apply font size/style on new page
                    doc.setFontSize(currentFontSize)
                    applyStyle(currentFontStyle)
                }
            }

            // Render the word
            doc.text(word, currentX, currentY)

            // Draw strikethrough line if needed
            if (isStrikethrough) {
                const lineY = currentY - currentFontSize * 0.3 // Adjust position slightly
                doc.setLineWidth(0.5)
                doc.line(currentX, lineY, currentX + wordWidth, lineY)
            }

            currentX += wordWidth
        })
    })

    // Reset to normal style after processing all tokens for this block
    applyStyle('normal')

    // Return the baseline Y of the last line rendered, or the original Y if no tokens were processed.
    return tokens.length > 0 ? currentY : y
}
