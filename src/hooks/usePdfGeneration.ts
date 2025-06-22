import { useState, useCallback, useEffect } from 'react'
import { Event } from '../types'
import { fetchOpenPlannerApi } from '../services/hooks/useOpenPlannerApi'
import { useNotification } from './notificationHook'

interface PdfMetadata {
    exists: boolean
    lastModified?: string
    size?: number
    url?: string
}

interface UsePdfGenerationReturn {
    isGenerating: boolean
    pdfMetadata: PdfMetadata | null
    isLoadingMetadata: boolean
    generatePdf: () => Promise<void>
    updatePdf: () => Promise<void>
    fetchPdfMetadata: () => Promise<void>
}

export const usePdfGeneration = (event: Event, onSuccess?: () => void): UsePdfGenerationReturn => {
    const [isGenerating, setIsGenerating] = useState(false)
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
    const [pdfMetadata, setPdfMetadata] = useState<PdfMetadata | null>(null)
    const { createNotification } = useNotification()

    const validateEvent = useCallback(() => {
        if (!event.apiKey) {
            createNotification('No API key available', { type: 'error' })
            return false
        }

        if (!event.publicEnabled) {
            createNotification('Enable public website first to generate PDF', { type: 'error' })
            return false
        }

        return true
    }, [event.apiKey, event.publicEnabled, createNotification])

    const handlePdfOperation = useCallback(
        async (operation: 'generate' | 'update') => {
            if (!validateEvent()) return

            setIsGenerating(true)
            try {
                await fetchOpenPlannerApi(event, 'event/export-pdf', {
                    method: 'POST',
                    body: { apiKey: event.apiKey },
                })
                createNotification(`PDF ${operation === 'generate' ? 'generated' : 'updated'} successfully`, {
                    type: 'success',
                })
                onSuccess?.()
                // Refresh metadata after operation
                await fetchPdfMetadata()
            } catch (error) {
                console.error(`Error ${operation}ing PDF:`, error)
                createNotification(
                    `Failed to ${operation} PDF: ` + (error instanceof Error ? error.message : 'Unknown error'),
                    { type: 'error' }
                )
            } finally {
                setIsGenerating(false)
            }
        },
        [event, createNotification, onSuccess, validateEvent]
    )

    const generatePdf = useCallback(() => handlePdfOperation('generate'), [handlePdfOperation])
    const updatePdf = useCallback(() => handlePdfOperation('update'), [handlePdfOperation])

    const fetchPdfMetadata = useCallback(async () => {
        if (!event.apiKey) return

        setIsLoadingMetadata(true)
        try {
            const response = (await fetchOpenPlannerApi(event, 'event/pdf-metadata', {
                method: 'GET',
            })) as PdfMetadata
            setPdfMetadata(response)
        } catch (error) {
            console.error('Error fetching PDF metadata:', error)
            // Don't show notification for metadata fetch errors as it's not critical
        } finally {
            setIsLoadingMetadata(false)
        }
    }, [event])

    useEffect(() => {
        fetchPdfMetadata()
    }, [fetchPdfMetadata])

    return {
        isGenerating,
        pdfMetadata,
        isLoadingMetadata,
        generatePdf,
        updatePdf,
        fetchPdfMetadata,
    }
}
