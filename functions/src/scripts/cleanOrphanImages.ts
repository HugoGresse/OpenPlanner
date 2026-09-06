/**
 * Deletes orphan images: objects in the storage bucket that no Firestore
 * document references anymore.
 *
 * Safety model:
 * - DRY RUN by default; nothing is deleted without --delete
 * - Only image files are candidates (json/pdf/other files are never touched)
 * - An image is kept when its uuid or file name appears ANYWHERE in the
 *   Firestore data (any event field, subcollection, markdown block, url in
 *   any encoding) — matching errs on the side of keeping files
 * - event.files entries and pending-edit photos are always protected
 * - The bucket has a 7-day soft delete policy: a wrong deletion is recoverable
 *
 * Usage (from functions/):
 *   npx tsx src/scripts/cleanOrphanImages.ts [--project <id>] [--bucket <name>]
 *                                            [--event <eventId>] [--delete]
 * Works against the emulator when FIRESTORE_EMULATOR_HOST and
 * FIREBASE_STORAGE_EMULATOR_HOST are set.
 */
import firebase from 'firebase-admin'

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.avif', '.bmp']
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

interface Args {
    project: string
    bucket: string
    eventId: string | null
    performDelete: boolean
}

const parseArgs = (): Args => {
    const argv = process.argv.slice(2)
    const valueOf = (flag: string): string | null => {
        const index = argv.indexOf(flag)
        return index !== -1 ? argv[index + 1] || null : null
    }
    return {
        project: valueOf('--project') || process.env.GCLOUD_PROJECT || 'conferencecenterr',
        bucket: valueOf('--bucket') || process.env.BUCKET || 'conferencecenterr.appspot.com',
        eventId: valueOf('--event'),
        performDelete: argv.includes('--delete'),
    }
}

// Serializes a document and every document of its subcollections (recursively,
// bounded) into one searchable string
const dumpDocument = async (
    doc: firebase.firestore.DocumentSnapshot,
    depth: number,
    chunks: string[]
): Promise<void> => {
    chunks.push(JSON.stringify(doc.data() ?? {}))
    if (depth <= 0) {
        return
    }
    const subCollections = await doc.ref.listCollections()
    for (const subCollection of subCollections) {
        const snapshot = await subCollection.get()
        for (const subDoc of snapshot.docs) {
            await dumpDocument(subDoc, depth - 1, chunks)
        }
    }
}

const collectReferences = async (
    firestore: firebase.firestore.Firestore,
    eventId: string | null
): Promise<{ blob: string; protectedPaths: Set<string> }> => {
    const chunks: string[] = []
    const protectedPaths = new Set<string>()

    const eventDocs = eventId
        ? [await firestore.collection('events').doc(eventId).get()]
        : (await firestore.collection('events').get()).docs

    for (const eventDoc of eventDocs) {
        if (!eventDoc.exists) {
            continue
        }
        const files = (eventDoc.data() as { files?: Record<string, string | null> }).files || {}
        for (const path of Object.values(files)) {
            if (typeof path === 'string' && path.length) {
                protectedPaths.add(path)
            }
        }
        await dumpDocument(eventDoc as firebase.firestore.DocumentSnapshot, 2, chunks)
        process.stdout.write('.')
    }
    console.log('')
    return { blob: chunks.join('\n'), protectedPaths }
}

const isImage = (objectName: string): boolean => {
    const lower = objectName.toLowerCase()
    return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

// The token whose presence in Firestore marks the object as referenced: the
// uuid when the file name has one (all uploader paths do), else the base name
const referenceToken = (objectName: string): string => {
    const baseName = objectName.split('/').pop() || objectName
    const uuidMatch = baseName.match(UUID_PATTERN)
    return uuidMatch ? uuidMatch[0] : baseName
}

const formatBytes = (bytes: number): string =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.round(bytes / 1024)} KB`

const main = async () => {
    const args = parseArgs()
    console.log(`project=${args.project} bucket=${args.bucket} scope=${args.eventId || 'ALL events'}`)
    console.log(args.performDelete ? '!!! DELETE MODE !!!' : 'Dry run (pass --delete to actually delete)')

    const app = firebase.initializeApp({ projectId: args.project, storageBucket: args.bucket })
    const firestore = app.firestore()
    const bucket = app.storage().bucket(args.bucket)

    console.log('Collecting Firestore references...')
    const { blob, protectedPaths } = await collectReferences(firestore, args.eventId)
    console.log(`Reference blob: ${(blob.length / 1e6).toFixed(1)} MB, ${protectedPaths.size} protected file paths`)

    const prefix = args.eventId ? `events/${args.eventId}/` : 'events/'
    const [files] = await bucket.getFiles({ prefix })
    console.log(`${files.length} objects under ${prefix}`)

    const orphans: { name: string; sizeBytes: number }[] = []
    for (const file of files) {
        if (!isImage(file.name)) continue
        const baseName = file.name.split('/').pop() || ''
        if (protectedPaths.has(file.name) || baseName.startsWith('pending-edit-')) continue
        if (blob.includes(referenceToken(file.name))) continue
        orphans.push({ name: file.name, sizeBytes: parseInt(String(file.metadata.size || 0), 10) })
    }

    const totalBytes = orphans.reduce((total, orphan) => total + orphan.sizeBytes, 0)
    const perEvent = new Map<string, { count: number; bytes: number }>()
    for (const orphan of orphans) {
        const eventId = orphan.name.split('/')[1] || '?'
        const entry = perEvent.get(eventId) || { count: 0, bytes: 0 }
        entry.count += 1
        entry.bytes += orphan.sizeBytes
        perEvent.set(eventId, entry)
    }

    console.log(`\n${orphans.length} orphan images, ${formatBytes(totalBytes)} reclaimable`)
    for (const [eventId, entry] of [...perEvent.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
        console.log(`  ${eventId}: ${entry.count} files, ${formatBytes(entry.bytes)}`)
    }

    if (!args.performDelete) {
        console.log('\nDry run finished. Re-run with --delete to remove these files.')
        return
    }

    console.log('\nDeleting...')
    let deleted = 0
    for (const orphan of orphans) {
        try {
            await bucket.file(orphan.name).delete()
            deleted += 1
            if (deleted % 100 === 0) console.log(`  ${deleted}/${orphans.length}`)
        } catch (error) {
            console.warn(`  failed: ${orphan.name}: ${error}`)
        }
    }
    console.log(`Deleted ${deleted}/${orphans.length} files (${formatBytes(totalBytes)}).`)
    console.log('The bucket keeps soft-deleted objects for 7 days: recovery is possible via gcloud storage restore.')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
