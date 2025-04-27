/**
 * Crop a JPEG image
 * @param image The source image element
 * @param crop The crop dimensions {x, y, width, height}
 * @returns The cropped image data URL
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

    ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)

    return canvas.toDataURL('image/jpeg')
}
