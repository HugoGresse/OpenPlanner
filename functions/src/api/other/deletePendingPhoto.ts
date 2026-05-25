import firebase from 'firebase-admin'
import { getStorageBucketName } from '../dao/firebasePlugin'

// Marker prefix used by selfPhotoUploadPOST when naming uploaded files.
// Only photos created through the speaker self-edit flow carry this prefix
// in their object path, so it is safe to delete them without consulting
// any other reference. Admin-uploaded photos (different naming) are never
// matched.
const PENDING_PHOTO_PATH_MARKER = '_pending-edit-'

/**
 * Best-effort delete of a pending-edit photo file from Cloud Storage.
 *
 * Accepts the public file URL stored on `pendingEdit.patch.photoUrl`. We
 * only delete files whose object path contains the `pending-edit-` marker
 * — any other URL (admin-uploaded photos, externally hosted images,
 * unrelated data URIs) is left untouched. Errors are swallowed and logged
 * so a failed delete does not block the reject/approve flow from
 * persisting its status update.
 */
export const deletePendingPhotoFromUrl = async (
    firebaseApp: firebase.app.App,
    photoUrl: string | null | undefined
): Promise<{ deleted: boolean; reason?: string }> => {
    if (!photoUrl || typeof photoUrl !== 'string') {
        return { deleted: false, reason: 'no-url' }
    }
    if (!photoUrl.includes(PENDING_PHOTO_PATH_MARKER)) {
        return { deleted: false, reason: 'not-a-pending-photo' }
    }

    let pathname: string
    try {
        pathname = new URL(photoUrl).pathname
    } catch {
        return { deleted: false, reason: 'invalid-url' }
    }

    // Public file URLs are shaped like
    //   https://<bucket>.storage.googleapis.com/events/<eventId>/<uuid>_pending-edit-<speaker>-<ts>.<ext>
    // or
    //   https://storage.googleapis.com/<bucket>/events/<eventId>/<uuid>_pending-edit-...
    // Strip a leading slash and any bucket-name prefix to land back at the
    // bucket-relative object path.
    let objectPath = pathname.replace(/^\/+/, '')
    const bucketName = getStorageBucketName()
    if (bucketName && objectPath.startsWith(`${bucketName}/`)) {
        objectPath = objectPath.slice(bucketName.length + 1)
    }

    if (!objectPath.startsWith('events/')) {
        return { deleted: false, reason: 'unexpected-path' }
    }

    try {
        const bucket = firebaseApp.storage().bucket(bucketName)
        await bucket.file(objectPath).delete({ ignoreNotFound: true })
        return { deleted: true }
    } catch (err) {
        console.warn('Failed to delete pending photo from storage', objectPath, err)
        return { deleted: false, reason: 'storage-error' }
    }
}
