export type PublicFaqItemType = {
    id: string
    question: string
    answer: string
    order: number
}

export type PublicFaqCategoryType = {
    id: string
    name: string
    order: number
    faqs: PublicFaqItemType[]
}

export type PublicFaqType = {
    category: PublicFaqCategoryType
    questions: PublicFaqItemType[]
}

export type PublicFaqReply = {
    faq: PublicFaqType[]
    eventName: string
}
