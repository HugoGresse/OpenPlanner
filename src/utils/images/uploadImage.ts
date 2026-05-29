import { ref, uploadBytes } from 'firebase/storage'
import { storage } from '../../services/firebase'
import { v4 as uuidv4 } from 'uuid'

export const uploadImage = async (imageFolder: string, image: Blob): Promise<string> => {
    const fileName = uuidv4()
    const storageBucket = storage.app.options.storageBucket!

    // imageFolder may be a full public URL; extract just the storage path
    const baseUrl = `https://storage.googleapis.com/${storageBucket}/`
    const altUrl = `https://${storageBucket}.storage.googleapis.com/`
    const folderPath = imageFolder.startsWith(baseUrl)
        ? imageFolder.slice(baseUrl.length)
        : imageFolder.startsWith(altUrl)
        ? imageFolder.slice(altUrl.length)
        : imageFolder

    const outputRef = ref(storage, `${folderPath}${fileName}`)

    await uploadBytes(outputRef, image, {})
    return `https://${storageBucket}.storage.googleapis.com/${outputRef.fullPath}`
}
