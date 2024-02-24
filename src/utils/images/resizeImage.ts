import imageBlobReduce from 'image-blob-reduce'

export const resizeImage = async (file: File, maxSize: number = 500) => {
    switch (file.type) {
        case 'image/svg+xml':
            return file
        default:
            const reduce = imageBlobReduce()
            return await reduce.toBlob(file, { max: maxSize })
    }
}
