import { Autocomplete, Box, createFilterOptions, TextField, Typography } from '@mui/material'
import * as React from 'react'
import { Controller, FieldValues, Path, useFormContext } from 'react-hook-form'
import { getTopModelIds, OpenRouterModel } from '../../services/openRouter'

const TOP_GROUP = 'Top picks'
const ALL_GROUP = 'All models'

type Option = { id: string; isTop: boolean; model: OpenRouterModel }

type ModelAutocompleteProps<T extends FieldValues> = {
    name: Path<T>
    label: string
    helperText?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    models: OpenRouterModel[]
    margin?: 'none' | 'dense' | 'normal'
    variant?: 'standard' | 'filled' | 'outlined'
}

// Match against both the human-readable name and the id, so typing "claude"
// finds "anthropic/claude-sonnet-4" and typing the slug works too.
const filterOptions = createFilterOptions<Option>({
    stringify: (option) => `${option.model.name ?? ''} ${option.id}`,
})

// Convert OpenRouter's per-token price (USD per token, given as a string) into
// a short "$X" string per million tokens — what users actually compare across
// providers.
const formatPricePerMillion = (perTokenStr: string | undefined): string | null => {
    if (perTokenStr == null) return null
    const n = Number(perTokenStr)
    if (!Number.isFinite(n)) return null
    if (n === 0) return '$0'
    const perMillion = n * 1_000_000
    let formatted: string
    if (perMillion >= 1) formatted = perMillion.toFixed(2).replace(/\.?0+$/, '')
    else if (perMillion >= 0.01) formatted = perMillion.toFixed(3).replace(/\.?0+$/, '')
    else formatted = perMillion.toExponential(1)
    return `$${formatted}`
}

const formatPricing = (m: OpenRouterModel): string => {
    const inPrice = formatPricePerMillion(m.pricing?.prompt) ?? '?'
    const outPrice = formatPricePerMillion(m.pricing?.completion) ?? '?'
    return `${inPrice} in / ${outPrice} out · /Mtok`
}

const formatCreated = (created: number | undefined): string | null => {
    if (!created) return null
    const d = new Date(created * 1000)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
}

export function ModelAutocomplete<T extends FieldValues>({
    name,
    label,
    helperText,
    placeholder,
    disabled,
    required,
    models,
    margin = 'dense',
    variant = 'filled',
}: ModelAutocompleteProps<T>) {
    const { control } = useFormContext<T>()
    const topIds = React.useMemo(() => getTopModelIds(models), [models])

    const options = React.useMemo<Option[]>(() => {
        const enriched: Option[] = models.map((m) => ({
            id: m.id,
            isTop: topIds.has(m.id),
            model: m,
        }))
        // "Top picks" first, alphabetical within each group.
        enriched.sort((a, b) => {
            if (a.isTop !== b.isTop) return a.isTop ? -1 : 1
            return a.id.localeCompare(b.id)
        })
        return enriched
    }, [models, topIds])

    // O(1) id -> option lookup so the controller renderer doesn't linearly
    // scan the (potentially ~300-entry) catalog on every keystroke.
    const optionsById = React.useMemo(() => {
        const map = new Map<string, Option>()
        for (const o of options) map.set(o.id, o)
        return map
    }, [options])

    return (
        <Controller
            name={name}
            control={control}
            rules={{ required }}
            render={({ field: { value, onChange, onBlur, ref }, fieldState: { error } }) => {
                const stringValue = typeof value === 'string' ? value : ''
                const matched = optionsById.get(stringValue)
                return (
                    <Autocomplete<Option, false, false, true>
                        freeSolo
                        autoHighlight
                        options={options}
                        filterOptions={filterOptions}
                        disabled={disabled}
                        value={matched ?? stringValue}
                        onChange={(_, next) => {
                            if (next == null) onChange('')
                            else if (typeof next === 'string') onChange(next)
                            else onChange(next.id)
                        }}
                        onInputChange={(_, input, reason) => {
                            // Keep the form value in sync with raw input so a
                            // user-pasted id (not in the list) is captured.
                            if (reason === 'input') onChange(input)
                            if (reason === 'clear') onChange('')
                        }}
                        onBlur={onBlur}
                        isOptionEqualToValue={(option, val) =>
                            typeof val === 'string' ? option.id === val : option.id === val.id
                        }
                        getOptionLabel={(option) => (typeof option === 'string' ? option : option.id)}
                        groupBy={(option) => (option.isTop ? TOP_GROUP : ALL_GROUP)}
                        renderOption={(props, option) => {
                            const m = option.model
                            const date = formatCreated(m.created)
                            return (
                                <Box component="li" {...props} key={option.id}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontWeight: option.isTop ? 600 : 400,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                            {m.name || m.id}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ display: 'block', fontSize: '0.7rem' }}>
                                            {m.id}
                                            {date ? ` · ${date}` : ''} · {formatPricing(m)}
                                        </Typography>
                                    </Box>
                                </Box>
                            )
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                inputRef={ref}
                                margin={margin}
                                variant={variant}
                                label={label}
                                placeholder={placeholder}
                                helperText={error?.message ?? helperText}
                                error={!!error}
                                required={required}
                                disabled={disabled}
                                fullWidth
                            />
                        )}
                    />
                )
            }}
        />
    )
}
