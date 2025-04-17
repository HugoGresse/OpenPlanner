import { Event, Faq, FaqCategory } from '../types'
import { markdownToPdf } from './markdownToPdf/markdownToPdf'

type FaqWithoutTimestamps = Omit<Faq, 'updatedAt' | 'createdAt'>

export const generateFaqPdf = async (event: Event, category: FaqCategory, faqs: FaqWithoutTimestamps[]) => {
    // Generate markdown content
    const markdownContent = generateMarkdownContent(event, category, faqs)

    // Convert markdown to PDF
    const pdfBlob = await markdownToPdf(markdownContent)

    // Create download link and trigger download
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.name}-${category.name}-FAQ.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

const generateMarkdownContent = (event: Event, category: FaqCategory, faqs: FaqWithoutTimestamps[]): string => {
    // Generate main content
    const content = faqs
        .map(
            (faq, index) => `
## ${faq.question}

${faq.answer}
`
        )
        .join('\n\n')

    return `# ${event.name} - ${category.name} FAQ

[TOC]

${content}
`
}
