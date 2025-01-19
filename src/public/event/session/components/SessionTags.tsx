import { Box, Chip } from '@mui/material'
import { Category } from '../../../../types'
import { LanguageFlag } from '../../components/LanguageFlag'

type SessionTagsProps = {
    category: Category | null
    level: string | null | undefined
    language: string | null | undefined
}

export const SessionTags = ({ category, level, language }: SessionTagsProps) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
        {category && (
            <Chip
                label={category.name}
                sx={{
                    bgcolor: category.color || 'primary.main',
                    color: 'white',
                }}
            />
        )}
        {level && (
            <Chip
                label={level}
                sx={{
                    bgcolor: 'grey.700',
                    color: 'white',
                }}
            />
        )}
        {language && <LanguageFlag language={language} size="sm" />}
    </Box>
)
