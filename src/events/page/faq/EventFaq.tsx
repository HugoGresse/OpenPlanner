import { useState } from 'react'
import { Box, Button, Card, Container, Typography } from '@mui/material'
import { Event, FaqCategory } from '../../../types'
import { useFaqs } from '../../../services/hooks/useFaqs'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { FaqCategoryItem } from './FaqCategoryItem'
import { NewFaqCategoryDialog } from './NewFaqCategoryDialog'
import { getFaqBaseLinkLink } from './faqLink'
import { ContentCopy, ImportExport, OpenInNew } from '@mui/icons-material'
import { FaqCategoryImportDialog } from './components/FaqCategoryImportDialog'
import { TypographyCopyable } from '../../../components/TypographyCopyable'

export const EventFAQ = ({ event }: { event: Event }) => {
    const queryResult = useFaqs(event)
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [importDialogOpen, setImportDialogOpen] = useState(false)
    if (queryResult.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={queryResult} />
    }

    const categoryData = queryResult.data || []

    const faqLink = getFaqBaseLinkLink(event)
    const privateCategories = categoryData.filter((c) => c.private)

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
                <Box>
                    <Button component="a" href={faqLink} target="_blank" startIcon={<OpenInNew />}>
                        Open public FAQ
                    </Button>
                    <Button
                        color="primary"
                        startIcon={<ContentCopy />}
                        onClick={() => {
                            navigator.clipboard.writeText(faqLink)
                        }}>
                        Copy FAQ Link
                    </Button>
                </Box>
                <Button
                    color="primary"
                    startIcon={<ImportExport />}
                    onClick={() => {
                        setImportDialogOpen(true)
                    }}>
                    Import FAQ from another event
                </Button>
            </Box>

            <Card sx={{ padding: 2, marginY: 2 }}>
                <Typography variant="body1" gutterBottom>
                    Public FAQ link
                </Typography>
                <TypographyCopyable>{faqLink}</TypographyCopyable>

                <Typography variant="body1" mt={2} gutterBottom>
                    Private FAQ pages: {privateCategories.length}
                </Typography>
                {privateCategories.map((category) => (
                    <Box key={category.id}>
                        <Typography variant="subtitle1" gutterBottom>
                            {category.name}
                        </Typography>
                        <TypographyCopyable singleLine={true}>{`${faqLink}${category.privateId}`}</TypographyCopyable>
                    </Box>
                ))}
            </Card>

            {categoryData.map((faqCategory: FaqCategory) => (
                <Card
                    key={faqCategory.id}
                    sx={{
                        padding: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        flexFlow: 'row',
                        flexWrap: 'wrap',
                        alignContent: 'flex-start',
                        marginY: 2,
                    }}>
                    <FaqCategoryItem category={faqCategory} event={event} />
                </Card>
            ))}
            <Box marginY={2}>
                <Button
                    onClick={() => {
                        setAddDialogOpen(true)
                    }}>
                    Add FAQ top-level category
                </Button>
            </Box>
            <NewFaqCategoryDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                categoryCount={categoryData.length}
                eventId={event.id}
            />
            <FaqCategoryImportDialog
                open={importDialogOpen}
                onClose={() => setImportDialogOpen(false)}
                currentEventId={event.id}
            />
        </Container>
    )
}
