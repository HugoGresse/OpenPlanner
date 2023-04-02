import { getFilesNames, getUploadFilePath } from '../../events/actions/updateWebsiteActions/getFilesNames'
import { ref, uploadBytes } from 'firebase/storage'
import { storage } from '../../services/firebase'
import { Event } from '../../types'
import { v4 as uuidv4 } from 'uuid'

export const uploadImage = async (event: Event, image: Blob) => {
    const fileNames = await getFilesNames(event)
    const uploadPaths = await getUploadFilePath(event)
    const fileName = uuidv4()

    const outputRef = ref(storage, `${fileNames.imageFolder}/${fileName}`)

    await uploadBytes(outputRef, image, {})
    return `${uploadPaths.imageFolder}${fileName}`
}
