import * as React from 'react'
import { useState } from 'react'
import { Box, Button, Card, Typography } from '@mui/material'
import { PublicFaqReply } from '../publicTypes'
import { PublicEventLayout } from '../PublicEventLayout'
import { PublicFaqCategory } from './PublicFaqCategory'
import { ExpandLess, ExpandMore } from '@mui/icons-material'

export type PublicEventFaqProps = {
    faqReply: PublicFaqReply
}
export const PublicEventFaq = ({ faqReply }: PublicEventFaqProps) => {
    const [selectedCategoryId, setSelectedCategory] = useState<string | null>(null)

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
                <Box display="flex" justifyContent="center" width="100%" gap={2} marginY={2}>
                    {faqReply.faq.map((faq, index) => {
                        return (
                            <Box key={index}>
                                <Button
                                    size="large"
                                    variant="contained"
                                    endIcon={selectedCategoryId === faq.category.id ? <ExpandLess /> : <ExpandMore />}
                                    onClick={() => {
                                        if (selectedCategoryId === faq.category.id) {
                                            setSelectedCategory(null)
                                            return
                                        }
                                        setSelectedCategory(faq.category.id)
                                    }}>
                                    <Typography variant="h6">{faq.category.name}</Typography>
                                </Button>
                            </Box>
                        )
                    })}
                </Box>

                {selectedCategory && <PublicFaqCategory faq={selectedCategory} />}
            </Card>
        </PublicEventLayout>
    )
}
