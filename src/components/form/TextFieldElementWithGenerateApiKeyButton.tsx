import { Box, Button, IconButton, InputAdornment } from '@mui/material'
import { generateApiKey } from '../../utils/generateApiKey'
import { useController } from 'react-hook-form'
import { ContentCopy } from '@mui/icons-material'
import { useCopyToClipboard } from '../../context/copyToClipboardHook'
import { TextFieldElementPrivate } from './TextFieldElementPrivate'
export type TextFieldElementWithGenerateApiKeyButtonProps = {
    required: boolean
    fullWidth: boolean
    buttonText: string
    name: string
    id: string
    label: string
    helperText: string
    disabled: boolean
}
export const TextFieldElementWithGenerateApiKeyButton = (props: TextFieldElementWithGenerateApiKeyButtonProps) => {
    const { field } = useController({ name: props.name })
    const copyAction = useCopyToClipboard()

    const copyApiKeyToClipboard = () => {
        copyAction(field.value)
    }

    return (
        <>
            <TextFieldElementPrivate
                margin="normal"
                required
                fullWidth
                id={props.id}
                label={props.label}
                name={props.name}
                variant="filled"
                disabled={false}
                helperText={props.helperText}
                InputProps={{
                    endAdornment: (
                        <Box display="flex" alignItems="center" ml={1} sx={{ cursor: 'pointer' }}>
                            <InputAdornment position="end">
                                <IconButton aria-label="copy API Key" onClick={copyApiKeyToClipboard} edge="end">
                                    <ContentCopy />
                                </IconButton>
                            </InputAdornment>
                        </Box>
                    ),
                }}
            />
            <Button
                onClick={() => {
                    field.onChange(generateApiKey())
                }}>
                {props.buttonText}
            </Button>
        </>
    )
}
