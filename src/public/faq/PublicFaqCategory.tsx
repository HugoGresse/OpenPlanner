import * as React from 'react'
import { useMemo, useState } from 'react'
import { PublicFaqType } from '../publicTypes'
import { Box, Typography } from '@mui/material'
import { FaqQuestion } from './FaqQuestion'
import { useSearchParams } from 'wouter'
import MDEditor from '@uiw/react-md-editor'

export type FaqCategoryProps = {
    faq: PublicFaqType
}
export const PublicFaqCategory = ({ faq }: FaqCategoryProps) => {
    const [searchParams, setSearchParams] = useSearchParams()
    const [isQuestionFromUrlOnOpen] = useState(
        (faq.questions || []).some((question) => question.id === searchParams.get('question'))
    )
    const [openQuestionId, setOpenQuestion] = React.useState<string | null>(
        searchParams.get('question') ? searchParams.get('question') : null
    )

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

    const questionsOrdered = useMemo(
        () =>
            isQuestionFromUrlOnOpen
                ? faq.questions.sort((a, b) => {
                      if (a.id === searchParams.get('question')) {
                          return -1
                      }
                      if (b.id === searchParams.get('question')) {
                          return 1
                      }
                      return 0
                  })
                : faq.questions,
        [isQuestionFromUrlOnOpen, faq]
    )

    return (
        <Box display="flex" justifyContent="center" flexWrap="wrap" width="100%" gap={2}>
            <Box width="100%" gap={2}>
                <Typography variant="h2" sx={{ fontSize: '1.5rem' }}>
                    {faq.category.name}
                </Typography>
            </Box>
            {faq.category.unifiedPage ? (
                <Box>
                    <MDEditor.Markdown
                        source={questionsOrdered.reduce((acc, question) => {
                            return acc + `# ${question.question}\n${question.answer}\n\n`
                        }, '')}
                    />
                </Box>
            ) : (
                questionsOrdered.map((question, index) => {
                    return (
                        <FaqQuestion
                            key={question.id}
                            question={question}
                            open={openQuestionId === question.id}
                            onClick={() => {
                                if (openQuestionId === question.id) {
                                    setSearchParams((prev) => {
                                        const newParams = new URLSearchParams(prev)
                                        newParams.delete('question')
                                        return newParams
                                    })
                                    setOpenQuestion(null)
                                    return
                                }
                                setSearchParams((prev) => {
                                    const newParams = new URLSearchParams(prev)
                                    newParams.set('question', question.id)
                                    return newParams
                                })
                                setOpenQuestion(question.id)
                            }}
                        />
                    )
                })
            )}
        </Box>
    )
}
