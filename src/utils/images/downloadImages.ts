import { Zip } from '../Zip'

/**
 * Download given images into a single zip file
 * @param zipName
 * @param images
 * @param convertSvgToPng
 */
export const downloadImages = async (
    zipName: string,
    images: { name: string; url: string }[],
    convertSvgToPng = false
) => {
    const zip = new Zip(zipName)
    await zip.fetch2Zip(images, '', convertSvgToPng)
    await zip.makeZip()
}
