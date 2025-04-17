import { LinkAnnotation, DestinationAnnotation } from './types'

/**
 * Processes link annotations to find and update matching destinations.
 * This function matches internal links (where the URL matches another annotation's URL)
 * and updates them with the correct destination page and Y position.
 *
 * @param tocAnnotations Array of TOC link annotations to process
 * @param contentAnnotations Array of content link annotations to process
 * @param destinationAnnotations Array of destination annotations to match against
 * @returns Processed annotations with updated destination information
 */
export function processLinkAnnotations(
    tocAnnotations: LinkAnnotation[],
    contentAnnotations: LinkAnnotation[],
    destinationAnnotations: DestinationAnnotation[]
): LinkAnnotation[] {
    const allAnnotations = [...tocAnnotations, ...contentAnnotations]

    return allAnnotations.map((link) => {
        if (!link.isInternal || !link.destHeadRef) {
            return { ...link }
        }

        // Find matching destination in the destination annotations array
        const matchingDest = destinationAnnotations.find((dest) => {
            return dest.headingText === link.destHeadRef
        })

        if (matchingDest) {
            // Create new object with updated destination info
            return {
                ...link,
                destPage: matchingDest.page,
                destY: matchingDest.y,
                url: undefined,
            }
        }

        return { ...link }
    })
}
