import { BupherPostRootObject } from './BupherScheduledPost'
import { makeBupherGraphQLRequest } from './bupherUtils'

export const getBupherScheduledPost = async (bupherSession: string, organizationId: string) => {
    const path = '?_o=Get ' + 'PostList'
    const response = await makeBupherGraphQLRequest(
        path,
        bupherSession,
        'POST',
        JSON.stringify({
            operationName: 'GetPostList',
            variables: {
                first: 20,
                after: null,
                organizationId: organizationId,
                status: ['draft'],
                sort: [
                    { field: 'dueAt', direction: 'asc' },
                    { field: 'createdAt', direction: 'desc' },
                ],
            },
            query: 'query GetPostList($first: Int!, $after: String, $organizationId: OrganizationId!, $channelIds: [ChannelId!], $tagIds: [TagId!], $status: [PostStatus!], $sort: [PostSortInput!]) {\n  posts(\n    input: {organizationId: $organizationId, filter: {channelIds: $channelIds, tagIds: $tagIds, status: $status}, sort: $sort}\n    first: $first\n    after: $after\n  ) {\n    edges {\n      node {\n        id\n        dueAt\n        ...PostCard_Post\n        __typename\n      }\n      __typename\n    }\n    pageInfo {\n      startCursor\n      endCursor\n      hasPreviousPage\n      hasNextPage\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment PostCardContent_Annotation on Annotation {\n  type\n  indices\n  content\n  text\n  url\n  __typename\n}\n\nfragment PostMediaAsset_Asset on Asset {\n  __typename\n  mimeType\n  thumbnail\n  source\n  ... on ImageAsset {\n    image {\n      altText\n      width\n      height\n      isAnimated\n      __typename\n    }\n    __typename\n  }\n  ... on VideoAsset {\n    video {\n      width\n      height\n      __typename\n    }\n    __typename\n  }\n  ... on DocumentAsset {\n    document {\n      filesize\n      numPages\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment PostCardNotes_Note on Note {\n  __typename\n  id\n  text\n  type\n  createdAt\n  updatedAt\n  author {\n    __typename\n    id\n    email\n    avatar\n    isDeleted\n  }\n  allowedActions\n}\n\nfragment PostCard_Post on Post {\n  id\n  allowedActions\n  ideaId\n  status\n  notificationStatus\n  via\n  schedulingType\n  author {\n    __typename\n    id\n    email\n    avatar\n    isDeleted\n  }\n  isCustomScheduled\n  isPinned\n  externalLink\n  createdAt\n  updatedAt\n  dueAt\n  sentAt\n  metricsUpdatedAt\n  text\n  externalLink\n  metadata {\n    __typename\n    ... on CommonPostMetadata {\n      type\n      annotations {\n        __typename\n        ...PostCardContent_Annotation\n      }\n      __typename\n    }\n    ... on InstagramPostMetadata {\n      firstComment\n      link\n      geolocation {\n        id\n        text\n        __typename\n      }\n      __typename\n    }\n    ... on PinterestPostMetadata {\n      title\n      url\n      board {\n        serviceId\n        name\n        url\n        description\n        avatar\n        __typename\n      }\n      __typename\n    }\n    ... on GoogleBusinessPostMetadata {\n      title\n      __typename\n    }\n    ... on TwitterPostMetadata {\n      threadCount\n      thread {\n        text\n        assets {\n          __typename\n          ...PostMediaAsset_Asset\n        }\n        __typename\n      }\n      retweet {\n        id\n        url\n        text\n        createdAt\n        user {\n          name\n          username\n          avatar\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on LinkedInPostMetadata {\n      firstComment\n      linkAttachment {\n        __typename\n        url\n        expandedUrl\n        title\n        thumbnail\n        text\n      }\n      __typename\n    }\n    ... on FacebookPostMetadata {\n      linkAttachment {\n        __typename\n        url\n        expandedUrl\n        title\n        thumbnail\n        text\n      }\n      __typename\n    }\n    ... on ThreadsPostMetadata {\n      threadCount\n      thread {\n        text\n        assets {\n          __typename\n          ...PostMediaAsset_Asset\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on MastodonPostMetadata {\n      threadCount\n      thread {\n        text\n        assets {\n          __typename\n          ...PostMediaAsset_Asset\n        }\n        __typename\n      }\n      __typename\n    }\n    ... on BlueskyPostMetadata {\n      threadCount\n      thread {\n        text\n        assets {\n          __typename\n          ...PostMediaAsset_Asset\n        }\n        __typename\n      }\n      linkAttachment {\n        __typename\n        url\n        expandedUrl\n        title\n        thumbnail\n        text\n      }\n      __typename\n    }\n  }\n  channel {\n    __typename\n    id\n    type\n    name\n    avatar\n    service\n    products\n    serviceId\n    serverUrl\n    timezone\n    displayName\n    isQueuePaused\n    isDisconnected\n    locationData {\n      location\n      __typename\n    }\n  }\n  tags {\n    id\n    name\n    color\n    __typename\n  }\n  notes {\n    ...PostCardNotes_Note\n    __typename\n  }\n  error {\n    message\n    supportUrl\n    __typename\n  }\n  assets {\n    __typename\n    ...PostMediaAsset_Asset\n  }\n  metrics {\n    type\n    name\n    displayName\n    description\n    value\n    nullableValue\n    unit\n    __typename\n  }\n  __typename\n}\n',
        })
    )

    if (!response.ok) {
        return {
            success: false,
            error: response.statusText + ' ' + response.status,
        }
    }
    const result = (await response.json()) as BupherPostRootObject
    return {
        success: true,
        result: result.data.posts.edges,
    }
}
