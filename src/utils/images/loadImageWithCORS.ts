/**
 * Loads an image with CORS enabled to prevent security errors when using the image in canvas operations
 *
 * @param src The image source URL
 * @returns A promise that resolves to the loaded image
 */
export const loadImageWithCORS = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image()

        // Set crossOrigin before setting the src
        img.crossOrigin = 'anonymous'

        img.onload = () => {
            resolve(img)
        }

        img.onerror = (error) => {
            reject(new Error(`Failed to load image: ${error}`))
        }

        // Set the src after setting up event handlers and crossOrigin
        img.src = src
    })
}

/**
 * Check if an image is from a different origin and needs CORS
 *
 * @param imageSrc The image source URL
 * @returns True if the image is cross-origin, false otherwise
 */
export const isImageCrossOrigin = (imageSrc: string): boolean => {
    // If it's a data URL, it's same-origin
    if (imageSrc.startsWith('data:')) {
        return false
    }

    try {
        // Check if the URL is from a different origin
        const url = new URL(imageSrc, window.location.href)
        return url.origin !== window.location.origin
    } catch (e) {
        // If parsing fails, assume it's same-origin
        return false
    }
}
