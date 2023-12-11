import * as React from 'react'
import { useState } from 'react'
import { Card, Typography } from '@mui/material'
import { PublicFaqReply } from '../publicTypes'
import { PublicEventLayout } from '../PublicEventLayout'
import { PublicFaqCategory } from './PublicFaqCategory'
import { PublicFaqCategoryPicker } from './PublicFaqCategoryPicker'

export type PublicEventFaqProps = {
    faqReply: PublicFaqReply
}
export const PublicEventFaq = ({ faqReply }: PublicEventFaqProps) => {
    const hasMoreThanOneCategory = faqReply.faq.length > 1
    const [selectedCategoryId, setSelectedCategory] = useState<string | null>(
        hasMoreThanOneCategory ? null : faqReply.faq[0].category.id
    )

    const selectedCategory = selectedCategoryId
        ? faqReply.faq.find((faq) => {
              return faq.category.id === selectedCategoryId
          })
        : null

    return (
        <PublicEventLayout>
            <Typography variant="h1">{faqReply.eventName} FAQ</Typography>
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
                        onSelectCategory={setSelectedCategory}
                    />
                ) : null}

                {selectedCategory && <PublicFaqCategory faq={selectedCategory} />}
            </Card>
        </PublicEventLayout>
    )
}
