import * as React from 'react'
import { Box, Button, Typography } from '@mui/material'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
import { PublicFaqReply } from '../publicTypes'

export type PublicFaqCategoryPickerProps = {
    faqReply: PublicFaqReply
    selectedCategoryId: string | null
    onSelectCategory: (categoryId: string | null) => void
}
export const PublicFaqCategoryPicker = ({
    faqReply,
    selectedCategoryId,
    onSelectCategory,
}: PublicFaqCategoryPickerProps) => {
    return (
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
                                    onSelectCategory(null)
                                    return
                                }
                                onSelectCategory(faq.category.id)
                            }}>
                            <Typography variant="h6">{faq.category.name}</Typography>
                        </Button>
                    </Box>
                )
            })}
        </Box>
    )
}
