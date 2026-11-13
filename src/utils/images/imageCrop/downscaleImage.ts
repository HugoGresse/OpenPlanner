// Downscale a raster image data URL to the given dimensions using a canvas.
// Used by the crop dialog's "image size" slider; not meaningful for SVG (vector).
export const downscaleImage = (
    dataUrl: string,
    targetWidth: number,
    targetHeight: number,
    mimeType: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = Math.max(1, Math.round(targetWidth))
            canvas.height = Math.max(1, Math.round(targetHeight))
            const context = canvas.getContext('2d')
            if (!context) {
                reject(new Error('Canvas 2D context unavailable'))
                return
            }
            context.imageSmoothingQuality = 'high'
            context.drawImage(image, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.9 : undefined))
        }
        image.onerror = () => reject(new Error('Failed to load image for resizing'))
        image.src = dataUrl
    })
}
