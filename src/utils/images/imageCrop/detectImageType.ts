/**
 * Detect image type from URL or data URL
 * @param imageUrl The image URL to check
 * @returns The detected image type ('jpeg', 'png', 'svg', or 'unknown')
 */
export const detectImageType = async (imageUrl: string): Promise<'jpeg' | 'png' | 'svg' | 'unknown'> => {
    // Check for obvious patterns in the URL or data URL
    if (imageUrl.startsWith('data:image/jpeg') || imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) {
        return 'jpeg'
    } else if (imageUrl.startsWith('data:image/png') || imageUrl.endsWith('.png')) {
        return 'png'
    } else if (imageUrl.startsWith('data:image/svg+xml') || imageUrl.includes('<svg') || imageUrl.endsWith('.svg')) {
        return 'svg'
    }

    // Handle HTTP URLs by fetching and checking content-type
    if (imageUrl.startsWith('http')) {
        try {
            const response = await fetch(imageUrl)
            const contentType = response.headers.get('content-type')

            if (contentType) {
                if (contentType.includes('image/jpeg')) {
                    return 'jpeg'
                } else if (contentType.includes('image/png')) {
                    return 'png'
                } else if (contentType.includes('image/svg+xml')) {
                    return 'svg'
                }
            }
        } catch (error) {
            console.error('Error fetching image type:', error)
        }
    }

    return 'unknown'
}
