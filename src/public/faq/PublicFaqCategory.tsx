import * as React from 'react'
import { PublicFaqType } from '../publicTypes'
import { Box, Typography } from '@mui/material'
import { FaqQuestion } from './FaqQuestion'

export type FaqCategoryProps = {
    faq: PublicFaqType
}
export const PublicFaqCategory = ({ faq }: FaqCategoryProps) => {
    const [openQuestionId, setOpenQuestion] = React.useState<string | null>(null)

    if (faq.questions.length === 0) {
        return (
            <Box display="flex" justifyContent="center">
                <Box sx={{ mt: 4, mb: 4 }}>
                    <h2>Nothing here yet</h2>
                    <p>There is no FAQ yet, please come back later.</p>
                </Box>
            </Box>
        )
    }

    return (
        <Box display="flex" justifyContent="center" flexWrap="wrap" width="100%" gap={2}>
            <Box width="100%" gap={2}>
                <Typography variant="h2">{faq.category.name}</Typography>
            </Box>
            {faq.questions.map((question, index) => {
                return (
                    <FaqQuestion
                        key={question.id}
                        question={question}
                        open={openQuestionId === question.id}
                        onClick={() => {
                            if (openQuestionId === question.id) {
                                setOpenQuestion(null)
                                return
                            }
                            setOpenQuestion(question.id)
                        }}
                    />
                )
            })}
        </Box>
    )
}
