import imageBlobReduce from 'image-blob-reduce'

export const resizeImage = async (file: File, maxSize: number = 500) => {
    const reduce = imageBlobReduce()
    return await reduce.toBlob(file, { max: maxSize })
}
