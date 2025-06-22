import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Event } from '../types'
import { TypographyCopyable } from './TypographyCopyable'
import { useEventFiles } from '../services/hooks/useEventFiles'
import { usePdfGeneration } from '../hooks/usePdfGeneration'
import { useEffect } from 'react'
import { DateTime } from 'luxon'

interface PdfScheduleSectionProps {
    event: Event
}

export const PdfScheduleSection = ({ event }: PdfScheduleSectionProps) => {
    const { filesPath, refetch: refetchFiles } = useEventFiles(event)
    const { isGenerating, pdfMetadata, isLoadingMetadata, generatePdf, updatePdf, fetchPdfMetadata } = usePdfGeneration(
        event,
        refetchFiles
    )

    const hasPdf = Boolean(filesPath.pdf)

    const formatLastModified = (lastModified?: string) => {
        if (!lastModified) return null
        try {
            return DateTime.fromISO(lastModified).toRelative()
        } catch {
            return null
        }
    }

    const formatFileSize = (size?: number) => {
        if (!size) return null
        const mb = size / (1024 * 1024)
        return `${mb.toFixed(1)} MB`
    }

    return (
        <Box>
            <Typography component="h2" variant="h5" gutterBottom>
                PDF Schedule
            </Typography>
            <Box mb={2}>
                {hasPdf ? (
                    <Box>
                        {filesPath.pdf && <TypographyCopyable>{filesPath.pdf}</TypographyCopyable>}

                        {/* PDF Metadata */}
                        {pdfMetadata?.exists && (
                            <Box mt={1} display="flex" gap={1} flexWrap="wrap" alignItems="center">
                                {pdfMetadata.lastModified && (
                                    <Chip
                                        label={`Last modified: ${formatLastModified(pdfMetadata.lastModified)}`}
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                                {pdfMetadata.size && (
                                    <Chip
                                        label={`Size: ${formatFileSize(pdfMetadata.size)}`}
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                                {isLoadingMetadata && (
                                    <Chip label="Loading metadata..." size="small" variant="outlined" />
                                )}
                                <Tooltip title="Refresh metadata">
                                    <IconButton size="small" onClick={fetchPdfMetadata} disabled={isLoadingMetadata}>
                                        <RefreshIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}

                        <Box mt={1}>
                            <LoadingButton
                                onClick={updatePdf}
                                loading={isGenerating}
                                disabled={!event.publicEnabled}
                                variant="outlined"
                                size="small">
                                Update PDF Schedule
                            </LoadingButton>
                        </Box>
                    </Box>
                ) : (
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            No PDF generated yet
                        </Typography>
                        <LoadingButton
                            onClick={generatePdf}
                            loading={isGenerating}
                            disabled={!event.publicEnabled}
                            variant="contained"
                            size="small">
                            Generate PDF
                        </LoadingButton>
                    </Box>
                )}
                {!event.publicEnabled && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Enable public website first to {hasPdf ? 'update' : 'generate'} PDF
                    </Typography>
                )}
            </Box>
        </Box>
    )
}
