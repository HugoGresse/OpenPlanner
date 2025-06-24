import { dataUriToBuffer } from 'data-uri-to-buffer'

const getAspectRatioFromViewBox = (svg: string): number | null => {
    const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/)
    if (viewBoxMatch) {
        const [, viewBox] = viewBoxMatch
        const parts = viewBox.split(/\s+/).map(Number)
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            return parts[2] / parts[3]
        }
    }
    return null
}

export const loadAndConvertSvgToPng = (
    svg: string,
    targetWidth?: number,
    targetHeight?: number
): Promise<ArrayBuffer> => {
    const svgAsBlob = new Blob([svg], { type: 'image/svg+xml' })
    const svgAsUrl = URL.createObjectURL(svgAsBlob)
    const img = new Image()
    img.src = svgAsUrl
    return new Promise((resolve, reject) => {
        img.onload = () => {
            const canvas = document.createElement('canvas')

            // If no dimensions specified, resize to 1000px while maintaining aspect ratio
            if (!targetWidth && !targetHeight) {
                let aspectRatio = img.width / img.height

                // If aspect ratio results in zero dimensions, try to get it from viewBox
                if (aspectRatio === 0 || !isFinite(aspectRatio)) {
                    const viewBoxAspectRatio = getAspectRatioFromViewBox(svg)
                    if (viewBoxAspectRatio) {
                        aspectRatio = viewBoxAspectRatio
                    } else {
                        // Fallback to 1:1 if no valid aspect ratio found
                        aspectRatio = 1
                    }
                }

                if (aspectRatio >= 1) {
                    // Landscape or square - use width as 1000px
                    canvas.width = 1000
                    canvas.height = 1000 / aspectRatio
                } else {
                    // Portrait - use height as 1000px
                    canvas.height = 1000
                    canvas.width = 1000 * aspectRatio
                }
            } else {
                // Use provided dimensions, fallback to image dimensions if undefined
                canvas.width = targetWidth ?? img.width
                canvas.height = targetHeight ?? img.height
            }

            const ctx = canvas.getContext('2d')
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

            const pngDataUri = canvas.toDataURL('image/png')
            const buffer = dataUriToBuffer(pngDataUri).buffer
            resolve(buffer)
        }
        img.onerror = (error) => {
            reject(error)
        }
    })
}
