type Author = {
    __typename: 'Author'
    id: string
    email: string
    avatar: string
    isDeleted: boolean
}

type Metadata = {
    __typename: string
    type: string
    annotations: any[]
    firstComment?: string | null
    linkAttachment?: string | null
    threadCount?: number
    thread?: any[]
    retweet?: any
}

type Channel = {
    __typename: 'Channel'
    id: string
    type: string
    name: string
    avatar: string
    service: string
    products: string[]
    serviceId: string
    serverUrl: string | null
    timezone: string
    displayName: string | null
    isQueuePaused: boolean
    isDisconnected: boolean
    locationData: any | null
}

type PostMetric = {
    type: string
    name: string
    displayName: string
    description: string
    value: number
    nullableValue: number | null
    unit: string
    __typename: 'PostMetric'
}

type Post = {
    id: string
    dueAt: string | null
    allowedActions: string[]
    ideaId: string | null
    status: string
    notificationStatus: string | null
    via: string
    schedulingType: string | null
    author: Author
    isCustomScheduled: boolean
    isPinned: boolean
    externalLink: string | null
    createdAt: string
    updatedAt: string
    sentAt: string | null
    metricsUpdatedAt: string | null
    text: string
    metadata: Metadata
    channel: Channel
    tags: any[]
    notes: any[]
    error: any | null
    assets: any[]
    metrics: PostMetric[]
    __typename: 'Post'
}

type PostsEdge = {
    node: Post
    __typename: 'PostsEdge'
}

type PaginationPageInfo = {
    startCursor: string
    endCursor: string
    hasPreviousPage: boolean
    hasNextPage: boolean
    __typename: 'PaginationPageInfo'
}

type PostsResults = {
    edges: PostsEdge[]
    pageInfo: PaginationPageInfo
    __typename: 'PostsResults'
}

type Data = {
    posts: PostsResults
}

export type BupherPostRootObject = {
    data: Data
}
