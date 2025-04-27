/**
 * Crop an SVG image preserving vector data
 * @param svgUrl The source SVG URL
 * @param crop The crop dimensions {x, y, width, height} - relative to the displayed image
 * @param displayDimensions Optional dimensions of the displayed image for scaling calculation
 * @returns A Promise resolving to the cropped SVG as a data URL
 */
export const cropSvgImage = async (
    svgUrl: string,
    crop: { x: number; y: number; width: number; height: number },
    displayDimensions?: { width: number; height: number }
): Promise<string> => {
    try {
        // Fetch the SVG content
        const response = await fetch(svgUrl)
        const svgText = await response.text()

        // Create a DOM parser to work with the SVG
        const parser = new DOMParser()
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
        const svgElement = svgDoc.documentElement

        // Get original viewBox or create one if it doesn't exist
        const originalViewBox = svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [
            0,
            0,
            parseFloat(svgElement.getAttribute('width') || '100'),
            parseFloat(svgElement.getAttribute('height') || '100'),
        ]

        // Get original SVG dimensions
        const originalWidth = originalViewBox[2] || parseFloat(svgElement.getAttribute('width') || '100')
        const originalHeight = originalViewBox[3] || parseFloat(svgElement.getAttribute('height') || '100')

        // Calculate scaling factor between displayed image and original SVG
        const scaleX = displayDimensions ? originalWidth / displayDimensions.width : 1
        const scaleY = displayDimensions ? originalHeight / displayDimensions.height : 1

        // Scale crop dimensions to match original SVG scale
        const scaledCrop = {
            x: crop.x * scaleX,
            y: crop.y * scaleY,
            width: crop.width * scaleX,
            height: crop.height * scaleY,
        }

        // Calculate the new viewBox based on the scaled crop
        const newViewBox = [
            originalViewBox[0] + scaledCrop.x,
            originalViewBox[1] + scaledCrop.y,
            scaledCrop.width,
            scaledCrop.height,
        ].join(' ')

        // Update SVG attributes
        svgElement.setAttribute('viewBox', newViewBox)
        // Preserve original aspect ratio but set new dimensions based on crop
        svgElement.setAttribute('width', scaledCrop.width.toString())
        svgElement.setAttribute('height', scaledCrop.height.toString())

        // Serialize back to string and convert to data URL
        const serializer = new XMLSerializer()
        const newSvgString = serializer.serializeToString(svgDoc)

        // Convert to data URL instead of blob URL
        const base64 = btoa(
            encodeURIComponent(newSvgString).replace(/%([0-9A-F]{2})/g, (_, p1) =>
                String.fromCharCode(parseInt(p1, 16))
            )
        )
        return `data:image/svg+xml;base64,${base64}`
    } catch (error) {
        console.error('Error cropping SVG:', error)
        return ''
    }
}
