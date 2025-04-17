export interface LinkAnnotation {
    page: number
    x: number
    y: number
    w: number
    h: number
    isInternal: boolean
    url?: string
    destPage?: number
    destY?: number
    destHeadRef?: string
    fromType?: string
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

export interface DestinationAnnotation {
    page: number
    y: number
    headingText: string
    headingLevel: number
}
