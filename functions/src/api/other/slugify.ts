// Mirrors src/utils/slugify.ts (the web admin derives team member ids from the name the same way).
export const slugify = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '-')
