import { ref, uploadBytes } from 'firebase/storage'
import { pathToStorageUrl, storage, storageUrlToPath } from '../../services/firebase'
import { v4 as uuidv4 } from 'uuid'

export const uploadImage = async (imageFolder: string, image: Blob): Promise<string> => {
    const fileName = uuidv4()

    // imageFolder may be a full public URL; reduce it to a bucket-relative path
    const folderPath = storageUrlToPath(imageFolder)
    const outputRef = ref(storage, `${folderPath}${fileName}`)

    await uploadBytes(outputRef, image, {})
    return pathToStorageUrl(outputRef.fullPath)
}
