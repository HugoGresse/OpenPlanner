import { Autocomplete, TextField, TextFieldProps } from '@mui/material'
import { Controller, FieldValues, Path, useFormContext } from 'react-hook-form'

interface Option {
    id: string | number
    label: string
}

interface OPAutocompleteProps<T extends FieldValues> {
    name: Path<T>
    options: Option[]
    label?: string
    required?: boolean
    multiple?: boolean
    disabled?: boolean
    placeholder?: string
    freeSolo?: boolean
    loading?: boolean
    loadingText?: string
    textFieldProps?: Partial<Omit<TextFieldProps, 'error' | 'label' | 'required' | 'placeholder'>>
}

export function OPAutocomplete<T extends FieldValues>({
    name,
    options,
    label,
    required = false,
    multiple = false,
    disabled = false,
    placeholder,
    freeSolo = false,
    loading = false,
    loadingText = 'Loading...',
    textFieldProps,
}: OPAutocompleteProps<T>) {
    const { control } = useFormContext<T>()

    return (
        <Controller
            name={name}
            control={control}
            rules={{ required }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <Autocomplete<Option, boolean, boolean, boolean>
                    multiple={multiple}
                    freeSolo={freeSolo}
                    options={options}
                    disabled={disabled}
                    value={value ?? (multiple ? [] : null)}
                    loading={loading}
                    loadingText={loadingText}
                    onChange={(_, newValue) => {
                        if (freeSolo && typeof newValue === 'string') {
                            onChange({ id: newValue, label: newValue })
                        } else if (Array.isArray(newValue)) {
                            onChange(
                                newValue.map((item) => (typeof item === 'string' ? { id: item, label: item } : item))
                            )
                        } else {
                            onChange(newValue)
                        }
                    }}
                    onBlur={(event) => {
                        if (freeSolo) {
                            const inputValue = (event.target as HTMLInputElement).value.trim()
                            if (inputValue) {
                                if (multiple) {
                                    const currentValue = (value ?? []) as Option[]
                                    if (!currentValue.some((option) => option.label === inputValue)) {
                                        onChange([...currentValue, { id: inputValue, label: inputValue }])
                                    }
                                } else if (!value || value.label !== inputValue) {
                                    onChange({ id: inputValue, label: inputValue })
                                }
                            }
                        }
                    }}
                    isOptionEqualToValue={(option, value) =>
                        typeof value === 'string' ? option.label === value : option.id === value?.id
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            {...textFieldProps}
                            label={label}
                            placeholder={placeholder}
                            error={!!error}
                            helperText={error?.message}
                            required={required}
                        />
                    )}
                />
            )}
        />
    )
}
