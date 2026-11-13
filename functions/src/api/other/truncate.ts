export const truncate = (text: string, limit: number) => (text.length > limit ? `${text.slice(0, limit - 1)}…` : text)
