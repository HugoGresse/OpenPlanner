// Resolution order: exact id, then exact name, then a name sent in the id field
// (older importers did that). Null when nothing matches.
export const findByIdOrName = (
    items: Array<{ id: string; name: string }> | undefined,
    id: string | undefined,
    name: string | undefined
): string | null => {
    const list = items || []
    const byId = id ? list.find((item) => item.id === id) : undefined
    const byName = name ? list.find((item) => item.name === name) : undefined
    const byNameInId = id ? list.find((item) => item.name === id) : undefined
    return byId?.id ?? byName?.id ?? byNameInId?.id ?? null
}
