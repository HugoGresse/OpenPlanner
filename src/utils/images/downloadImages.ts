import { Zip } from '../Zip'

/**
 * Download given images into a single zip file
 * @param zipName
 * @param images
 */
export const downloadImages = async (zipName: string, images: { name: string; url: string }[]) => {
    const zip = new Zip(zipName)
    await zip.fetch2Zip(images)
    await zip.makeZip()
}
