import * as React from 'react'
import { PublicFaqItemType } from '../publicTypes'
import MDEditor from '@uiw/react-md-editor'
import { Box, Button, styled, Typography } from '@mui/material'
import { Add, Remove } from '@mui/icons-material'

const FlexBox = styled(Box)(({ theme }) => ({
    flexBasis: '49%',
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius,
    borderColor: theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400],
    gap: theme.spacing(2),
    '@media (max-width:880px)': {
        flexBasis: '100%',
    },
}))
const BoxBorder = styled(Button)(({ theme }) => ({
    borderBottom: `1px solid `,
    justifyContent: 'flex-start',
}))

export type FaqQuestionProps = {
    question: PublicFaqItemType
    open: boolean
    onClick?: () => void
}
export const FaqQuestion = ({ question, open, onClick }: FaqQuestionProps) => {
    const content = open ? <MDEditor.Markdown source={question.answer} /> : null

    return (
        <FlexBox padding={2}>
            <BoxBorder
                fullWidth
                endIcon={open ? <Remove /> : <Add />}
                onClick={onClick}
                sx={{
                    borderColor: open ? 'inherit' : 'transparent',
                    marginBottom: open ? 2 : 0,
                }}>
                <Typography variant="h6" sx={{ width: '100%', textAlign: 'left' }}>
                    {question.question}
                </Typography>
            </BoxBorder>
            {content}
        </FlexBox>
    )
}
