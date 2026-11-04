import { expect, test } from 'vitest'
import { checkUploadPaths } from './content.js'

test('checkUploadPaths enforces the server limits', () => {
    expect(() => checkUploadPaths(['a.png', 'b.png'])).not.toThrow()
    expect(() => checkUploadPaths(['x/photo.jpg', 'y/photo.jpg'])).toThrow(/Duplicate file name "photo.jpg"/)
    expect(() => checkUploadPaths(['1', '2', '3', '4', '5', '6'])).toThrow(/At most 5 files/)
})
