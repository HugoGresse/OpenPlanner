import { useEffect, useMemo, useState } from 'react'
import { Autocomplete, Chip, CircularProgress, TextField } from '@mui/material'
import { Event } from '../../../types'
import { fetchOpenPlannerApi } from '../../../services/hooks/useOpenPlannerApi'

export type WhatsAppContact = { id: string; name: string; type: 'group' | 'user' }

export type WhatsAppChatPickerProps = {
    event: Event
    value: string
    onChange: (value: string) => void
    // Which contacts to offer; 'all' keeps both groups and single contacts.
    filterType?: 'group' | 'user' | 'all'
    label: string
    helperText?: string
    disabled?: boolean
}

// Fetches the GreenAPI contacts (server-side, token never exposed) and lets the operator pick a chat.
// freeSolo so a raw chatId or phone number can still be typed if it isn't in the list.
export const WhatsAppChatPicker = ({
    event,
    value,
    onChange,
    filterType = 'all',
    label,
    helperText,
    disabled,
}: WhatsAppChatPickerProps) => {
    const [contacts, setContacts] = useState<WhatsAppContact[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        fetchOpenPlannerApi<{ contacts: WhatsAppContact[] }>(event, 'whatsapp/contacts', { method: 'GET' })
            .then((res) => {
                if (!cancelled) setContacts(res.contacts || [])
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load contacts')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [event.id])

    const options = useMemo(
        () => (filterType === 'all' ? contacts : contacts.filter((c) => c.type === filterType)),
        [contacts, filterType]
    )

    // Resolve the stored string id to its contact object so the input shows the friendly name.
    const selected = options.find((c) => c.id === value) ?? (value ? value : null)

    return (
        <Autocomplete
            freeSolo
            disabled={disabled}
            options={options}
            value={selected}
            loading={loading}
            getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || option.id)}
            isOptionEqualToValue={(option, val) => option.id === (typeof val === 'string' ? val : val.id)}
            onChange={(_, newValue) => {
                if (newValue == null) onChange('')
                else if (typeof newValue === 'string') onChange(newValue)
                else onChange(newValue.id)
            }}
            // Capture a typed value (raw phone / chatId) that isn't selected from the list.
            onInputChange={(_, newInput, reason) => {
                if (reason === 'input') onChange(newInput)
            }}
            renderOption={(props, option) => (
                <li {...props} key={option.id}>
                    {option.name || option.id}
                    {option.type === 'group' && <Chip label="group" size="small" sx={{ ml: 1 }} />}
                </li>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    margin="normal"
                    label={label}
                    helperText={error ? `Couldn't load contacts: ${error} — type a chatId manually.` : helperText}
                    error={Boolean(error)}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
        />
    )
}
