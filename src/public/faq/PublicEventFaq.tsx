import { useState } from 'react'
import { Card, Typography } from '@mui/material'
import { PublicFaqReply } from '../publicTypes'
import { PublicEventLayout } from '../PublicEventLayout'
import { PublicFaqCategory } from './PublicFaqCategory'
import { PublicFaqCategoryPicker } from './PublicFaqCategoryPicker'
import { useSearchParams } from 'wouter'

export type PublicEventFaqProps = {
    faqReply: PublicFaqReply
}
export const PublicEventFaq = ({ faqReply }: PublicEventFaqProps) => {
    const hasMoreThanOneCategory = faqReply.faq.length > 1
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedCategoryId, setSelectedCategory] = useState<string | null>(
        hasMoreThanOneCategory
            ? searchParams.get('category')
                ? searchParams.get('category')
                : null
            : faqReply.faq[0].category.id
    )

    const selectedCategory = selectedCategoryId
        ? faqReply.faq.find((faq) => {
              return faq.category.id === selectedCategoryId
          })
        : null

    return (
        <PublicEventLayout>
            <Typography variant="h1" sx={{ fontSize: '2rem' }}>
                {faqReply.eventName} FAQ
            </Typography>
            <Card
                sx={{
                    padding: 2,
                    minHeight: '50vh',
                    display: 'flex',
                    flexDirection: 'column',
                    flexFlow: 'row',
                    flexWrap: 'wrap',
                    alignContent: 'flex-start',
                }}>
                {hasMoreThanOneCategory ? (
                    <PublicFaqCategoryPicker
                        faqReply={faqReply}
                        selectedCategoryId={selectedCategoryId}
                        onSelectCategory={(categoryId) => {
                            if (categoryId === selectedCategoryId) {
                                setSelectedCategory(null)
                                setSearchParams({})
                                return
                            }
                            setSelectedCategory(categoryId)
                            setSearchParams({ category: categoryId })
                        }}
                    />
                ) : null}

                {selectedCategory && <PublicFaqCategory faq={selectedCategory} />}
            </Card>
        </PublicEventLayout>
    )
}
