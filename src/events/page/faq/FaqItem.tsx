import { Faq } from '../../../types'
import { Box, IconButton, TextField } from '@mui/material'
import MDEditor from '@uiw/react-md-editor'
import { DeleteRounded, DragIndicator } from '@mui/icons-material'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type FaqItemProps = {
    faq: Omit<Faq, 'updatedAt' | 'createdAt'>
    onChange: (data: Omit<Faq, 'updatedAt' | 'createdAt'>) => void
    onDelete: () => void
}
export const FaqItem = ({ faq, onChange, onDelete }: FaqItemProps) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: faq.id })

    const style = {
        transform: transform
            ? CSS.Transform.toString({
                  ...transform,
                  scaleX: 1,
                  scaleY: 1,
              })
            : '',
        transition,
        zIndex: isDragging ? 1000 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <Box width="100%" mt={2} ref={setNodeRef} style={style}>
            <Box display="flex" alignItems="center" gap={1}>
                <div {...attributes} {...listeners}>
                    <DragIndicator sx={{ cursor: 'grab' }} />
                </div>
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
