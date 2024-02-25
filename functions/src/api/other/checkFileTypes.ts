import FileType from 'file-type'

export const checkFileTypes = async (buffer: Buffer, fileName: string) => {
    console.log(fileName)
    if (fileName.endsWith('.svg')) {
        return {
            mime: 'image/svg+xml',
            extension: 'svg',
        }
    }

    const fileType = await FileType.fromBuffer(buffer)

    if (!fileType) {
        return null
    }

    return {
        mime: fileType.mime,
        extension: fileType.ext,
    }
}
