import * as React from 'react'
import { TextFieldElement, TextFieldElementProps } from 'react-hook-form-mui'
import { Box, IconButton, InputAdornment } from '@mui/material'
import { useController } from 'react-hook-form'
import { ContentCopy, Visibility, VisibilityOff } from '@mui/icons-material'
import { useCopyToClipboard } from '../../context/copyToClipboardHook'
import { useState } from 'react'

export type TextFieldElementPrivateProps = {
    required?: boolean
    fullWidth?: boolean
    name: string
    id: string
    label: string
    helperText?: string
    disabled?: boolean
    visibleChars?: number
    showFullText?: boolean
}

export const TextFieldElementPrivate = (props: TextFieldElementPrivateProps & TextFieldElementProps) => {
    const { field } = useController({ name: props.name })
    const copyAction = useCopyToClipboard()
    const [showFullText, setShowFullText] = useState(props.showFullText === undefined ? false : props.showFullText)
    const visibleChars = props.visibleChars || 8

    const copyToClipboard = () => {
        copyAction(field.value)
    }

    const toggleVisibility = () => {
        setShowFullText(!showFullText)
    }

    const getMaskedValue = () => {
        if (!field.value) return ''
        if (showFullText) return field.value

        const valueStr = String(field.value)
        const halfVisible = Math.floor(visibleChars / 2)

        if (valueStr.length <= visibleChars) return valueStr

        const firstPart = valueStr.substring(0, halfVisible)
        const lastPart = valueStr.substring(valueStr.length - halfVisible)
        const middleBullets = '•'.repeat(Math.max(10, valueStr.length - visibleChars))

        return firstPart + middleBullets + lastPart
    }

    return (
        <TextFieldElement
            margin="normal"
            required={props.required}
            fullWidth={props.fullWidth}
            id={props.id}
            label={props.label}
            name={props.name}
            variant="filled"
            disabled={props.disabled}
            helperText={props.helperText}
            value={getMaskedValue()}
            onChange={(e) => field.onChange(e.target.value)}
            type={'text'}
            InputProps={{
                value: getMaskedValue(),
                endAdornment: (
                    <Box display="flex" alignItems="center" ml={1}>
                        <InputAdornment position="end">
                            <IconButton aria-label="toggle visibility" onClick={toggleVisibility} edge="end">
                                {showFullText ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                            <IconButton aria-label="copy text" onClick={copyToClipboard} edge="end">
                                <ContentCopy />
                            </IconButton>
                        </InputAdornment>
                    </Box>
                ),
            }}
        />
    )
}
