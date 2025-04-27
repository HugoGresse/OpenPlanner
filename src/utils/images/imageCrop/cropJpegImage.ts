/**
 * Crop a JPEG image
 * @param image The source image element
 * @param crop The crop dimensions {x, y, width, height}
 * @returns The cropped image data URL or empty string if there's an error
 */
export const cropJpegImage = (
    image: HTMLImageElement,
    crop: { x: number; y: number; width: number; height: number }
): string => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    canvas.width = crop.width
    canvas.height = crop.height

    try {
        ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
        return canvas.toDataURL('image/jpeg')
    } catch (error) {
        if (error instanceof DOMException && error.name === 'SecurityError') {
            console.error(
                'Cross-origin image security error. Make sure to:',
                '1. Set crossOrigin="anonymous" on the image element before setting src',
                '2. Ensure the server provides proper CORS headers (Access-Control-Allow-Origin)'
            )
            // Return an empty string or some fallback solution
            return ''
        }
        // Re-throw other errors
        throw error
    }
}
