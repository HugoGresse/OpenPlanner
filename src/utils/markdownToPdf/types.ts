export interface LinkAnnotation {
    page: number
    x: number
    y: number
    w: number
    h: number
    url?: string
    destPage?: number
    destY?: number
    pageNumber?: number
}

export interface TocEntry {
    text: string
    level: number
    page: number
    y: number
}

export interface Margins {
    top: number
    bottom: number
    left: number
    right: number
}
