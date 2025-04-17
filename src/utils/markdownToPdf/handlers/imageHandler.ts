import { jsPDF } from 'jspdf'
import { Margins } from '../types'
import { checkAddPage } from '../pageUtils'

const imagePadding = 3 // Vertical padding around images

/**
 * Fetches an image, calculates its dimensions, scales it, and adds it to the PDF document.
 * Handles page breaks if the image doesn't fit on the current page.
 *
 * @returns A Promise resolving to the new Y position and page number after adding the image.
 */
export const handleImage = async (
    doc: jsPDF,
    src: string,
    alt: string | undefined,
    margins: Margins,
    currentY: number,
    currentPage: number,
    maxLineWidth: number
): Promise<{ newY: number; newPage: number }> => {
    let pageCheck = { newY: currentY, newPage: currentPage }
    let currentLineY = pageCheck.newY
    let currentPageNum = pageCheck.newPage
    const availableWidth = maxLineWidth

    // Add padding before the image
    currentLineY += imagePadding
    pageCheck = checkAddPage(doc, currentLineY, imagePadding, margins, currentPageNum) // Check space for top padding
    currentLineY = pageCheck.newY
    currentPageNum = pageCheck.newPage

    try {
        // 1. Fetch the image data
        const response = await fetch(src)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        const imageBlob = await response.blob()
        const imageType = imageBlob.type.split('/')[1]?.toUpperCase() || 'JPEG' // Default to JPEG if type unknown

        // Convert blob to base64 data URL for jsPDF
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(imageBlob)
        })

        // 2. Get image properties (width/height) from the data URL
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = reject
            img.src = dataUrl
        })

        let imgWidth = img.naturalWidth
        let imgHeight = img.naturalHeight

        // 3. Scale image to fit available width
        if (imgWidth > availableWidth) {
            const scaleFactor = availableWidth / imgWidth
            imgWidth = availableWidth
            imgHeight = imgHeight * scaleFactor
        }

        // 4. Check if image height requires a new page (including bottom padding)
        const requiredHeight = imgHeight + imagePadding
        pageCheck = checkAddPage(doc, currentLineY, requiredHeight, margins, currentPageNum)

        if (pageCheck.newPage !== currentPageNum) {
            // Image doesn't fit on the current page, move to the next
            currentLineY = pageCheck.newY // Y position on the new page (top margin)
            currentPageNum = pageCheck.newPage
        } else {
            // Update Y even if the page doesn't change (might have added padding)
            currentLineY = pageCheck.newY
        }

        // 5. Add the image
        doc.addImage(dataUrl, imageType, margins.left, currentLineY, imgWidth, imgHeight)
        currentLineY += imgHeight + imagePadding // Update Y position after adding image and bottom padding
    } catch (error) {
        console.error(`Error fetching or adding image ${src}:`, error)
        // Optionally render placeholder text if image fails
        const errorText = `[Image load failed: ${alt || src}]`
        const lineHeight = 5 // Use standard line height for error text
        // Ensure doc state is reset for text
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)

        const errorLines = doc.splitTextToSize(errorText, availableWidth)

        for (const line of errorLines) {
            pageCheck = checkAddPage(doc, currentLineY, lineHeight, margins, currentPageNum)
            currentLineY = pageCheck.newY
            currentPageNum = pageCheck.newPage
            doc.text(line, margins.left, currentLineY)
            currentLineY += lineHeight
        }
        // Add padding after error text as well
        currentLineY += imagePadding
        pageCheck = checkAddPage(doc, currentLineY, 0, margins, currentPageNum) // Check page end after padding
        currentLineY = pageCheck.newY
        currentPageNum = pageCheck.newPage
    }

    return { newY: currentLineY, newPage: currentPageNum }
}
