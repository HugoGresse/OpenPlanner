import { dataUriToBuffer } from 'data-uri-to-buffer'

export const convertSvgToPng = (svg: string): Promise<ArrayBuffer> => {
    const svgAsBlob = new Blob([svg], { type: 'image/svg+xml' })
    const svgAsUrl = URL.createObjectURL(svgAsBlob)
    const img = new Image()
    img.src = svgAsUrl
    return new Promise((resolve, reject) => {
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx?.drawImage(img, 0, 0)

            const pngDataUri = canvas.toDataURL('image/png')
            const buffer = dataUriToBuffer(pngDataUri).buffer
            resolve(buffer)
        }
        img.onerror = (error) => {
            reject(error)
        }
    })
}
