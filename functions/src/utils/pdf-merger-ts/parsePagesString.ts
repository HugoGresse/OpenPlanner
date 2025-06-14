/**
 * Parse a string of page numbers into an array of numbers.
 * Examples:
 * - "1,2,3" => [1,2,3]
 * - "1-3" => [1,2,3]
 * - "1to3,5,7-9" => [1,2,3,5,7,8,9]
 *
 * @param {string} pagesString - The string to parse
 * @returns {number[]} Array of page numbers
 */
export function parsePagesString(pagesString: string): number[] {
    const pages: number[] = []
    const parts = pagesString.split(',')

    for (const part of parts) {
        const trimmedPart = part.trim()
        if (trimmedPart.includes('-')) {
            const [start, end] = trimmedPart.split('-').map((p) => parseInt(p.trim()))
            for (let i = start; i <= end; i++) {
                pages.push(i)
            }
        } else if (trimmedPart.includes('to')) {
            const [start, end] = trimmedPart.split('to').map((p) => parseInt(p.trim()))
            for (let i = start; i <= end; i++) {
                pages.push(i)
            }
        } else {
            pages.push(parseInt(trimmedPart))
        }
    }

    return pages
}
