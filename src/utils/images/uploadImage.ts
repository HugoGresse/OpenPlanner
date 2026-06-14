import { ref, uploadBytes } from 'firebase/storage'
import { pathToStorageUrl, storage, storageUrlToPath } from '../../services/firebase'
import { v4 as uuidv4 } from 'uuid'

const MIME_EXTENSIONS: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
}

const getBlobExtension = (blob: Blob): string => {
    const mime = blob.type.split(';')[0].trim().toLowerCase()
    if (MIME_EXTENSIONS[mime]) {
        return MIME_EXTENSIONS[mime]
    }
    const subtype = mime.split('/')[1]
    return subtype ? subtype.replace('+xml', '') : 'jpg'
}

export const uploadImage = async (imageFolder: string, image: Blob): Promise<string> => {
    const fileName = `${uuidv4()}.${getBlobExtension(image)}`

    // imageFolder may be a full public URL; reduce it to a bucket-relative path
    const folderPath = storageUrlToPath(imageFolder)
    const outputRef = ref(storage, `${folderPath}${fileName}`)

    await uploadBytes(outputRef, image, { contentType: image.type || undefined })
    return pathToStorageUrl(outputRef.fullPath)
}
