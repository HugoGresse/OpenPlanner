import React from 'react'
import { Box, Button, Card, Container } from '@mui/material'
import { Event, FaqCategory } from '../../../types'
import { useFaqs } from '../../../services/hooks/useFaqs'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { FaqCategoryItem } from './FaqCategoryItem'

export const EventFAQ = ({ event }: { event: Event }) => {
    const queryResult = useFaqs(event)

    if (queryResult.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={queryResult} />
    }

    const categoryData = queryResult.data || []

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
                {categoryData.map((faqCategory: FaqCategory) => (
                    <FaqCategoryItem key={faqCategory.id} category={faqCategory} event={event} />
                ))}
            </Card>
            <Box marginY={2}>
                <Button href={`/faq/new`}>Add FAQ top-level category</Button>
            </Box>
        </Container>
    )
}
