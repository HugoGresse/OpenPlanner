export interface ImageInfo {
    width: number
    height: number
    fileType: string | null
}

export const getImageInfo = async (imageSrc: string): Promise<ImageInfo> => {
    return new Promise((resolve) => {
        const img = new Image()

        img.onload = () => {
            const width = img.naturalWidth
            const height = img.naturalHeight

            // Get file type
            let fileType: string | null = null

            if (imageSrc.startsWith('data:')) {
                // For data URLs, extract the MIME type
                const match = imageSrc.match(/^data:([^;]+);/)
                if (match) {
                    fileType = match[1]
                }
            } else {
                // For regular URLs, try to fetch the content-type header
                fetch(imageSrc, { method: 'HEAD' })
                    .then((response) => {
                        const contentType = response.headers.get('content-type')
                        if (contentType) {
                            fileType = contentType
                        }
                        resolve({ width, height, fileType })
                    })
                    .catch(() => {
                        // If fetch fails, try to infer from URL extension
                        try {
                            const url = new URL(imageSrc)
                            const pathname = url.pathname
                            const extension = pathname.split('.').pop()?.toLowerCase()
                            if (extension) {
                                const mimeTypes: { [key: string]: string } = {
                                    jpg: 'image/jpeg',
                                    jpeg: 'image/jpeg',
                                    png: 'image/png',
                                    gif: 'image/gif',
                                    webp: 'image/webp',
                                    svg: 'image/svg+xml',
                                    bmp: 'image/bmp',
                                }
                                fileType = mimeTypes[extension] || `image/${extension}`
                            }
                        } catch {
                            // If URL parsing fails, continue without file type
                        }
                        resolve({ width, height, fileType })
                    })
                return
            }

            resolve({ width, height, fileType })
        }

        img.onerror = () => {
            resolve({ width: 0, height: 0, fileType: null })
        }

        img.src = imageSrc
    })
}
