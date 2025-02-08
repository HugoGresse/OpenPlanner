import { ref, uploadBytes } from 'firebase/storage'
import { storage } from '../../services/firebase'
import { v4 as uuidv4 } from 'uuid'

export const uploadImage = async (imageFolder: string, image: Blob): Promise<string> => {
    const fileName = uuidv4()

    const outputRef = ref(storage, `${imageFolder}${fileName}`)

    await uploadBytes(outputRef, image, {})
    return `${imageFolder}${fileName}`
}
