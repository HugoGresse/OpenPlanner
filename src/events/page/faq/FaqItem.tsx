import * as React from 'react'
import { Faq } from '../../../types'
import { Box, IconButton, TextField } from '@mui/material'
import MDEditor from '@uiw/react-md-editor'
import { DeleteRounded } from '@mui/icons-material'

export type FaqItemProps = {
    faq: Faq
    onChange: (data: Faq) => void
    onDelete: () => void
}
export const FaqItem = ({ faq, onChange, onDelete }: FaqItemProps) => {
    return (
        <Box width="100%" mt={2}>
            <Box display="flex">
                <TextField
                    required
                    label="Question"
                    variant="standard"
                    fullWidth
                    value={faq.question}
                    onChange={(e) => {
                        onChange({
                            ...faq,
                            question: e.target.value,
                        })
                    }}
                />
                <IconButton aria-label="Delete faq item" onClick={onDelete} edge="end">
                    <DeleteRounded />
                </IconButton>
            </Box>
            <Box minHeight={50}>
                <MDEditor
                    value={faq.answer}
                    minHeight={10}
                    height="100%"
                    preview="edit"
                    onChange={(e) => {
                        onChange({
                            ...faq,
                            answer: e || '',
                        })
                    }}
                />
            </Box>
        </Box>
    )
}
