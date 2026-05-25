import * as React from 'react'
import { useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Container,
    MenuItem,
    Paper,
    Select,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material'
import { API_URL } from '../../env'
import { KNOWN_SOCIALS, Speaker, Social } from '../../types'

export type PublicSpeakerEditFormProps = {
    eventId: string
    speakerId: string
}

type SelfResponse = {
    speaker: Partial<Speaker>
    editableFields: string[]
    editableCustomFieldIds: string[]
    eventName: string
}

const FIELD_LABELS: Record<string, string> = {
    name: 'Name',
    pronouns: 'Pronouns',
    jobTitle: 'Job title',
    bio: 'Bio',
    company: 'Company',
    companyLogoUrl: 'Company logo URL',
    geolocation: 'Geolocation',
    photoUrl: 'Photo URL',
}

const TEXT_FIELDS = ['name', 'pronouns', 'jobTitle', 'company', 'companyLogoUrl', 'geolocation', 'photoUrl']

export const PublicSpeakerEditForm = ({ eventId, speakerId }: PublicSpeakerEditFormProps) => {
    const [token, setToken] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<SelfResponse | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<Speaker>>({})
    const [customFields, setCustomFields] = useState<{ [k: string]: string | boolean }>({})
    const [socials, setSocials] = useState<Social[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const t = params.get('t')
        setToken(t)
        if (!t) {
            setError('Missing token')
            setLoading(false)
            return
        }
        ;(async () => {
            try {
                const url = new URL(API_URL as string)
                url.pathname += `v1/${eventId}/speakers/${speakerId}/self`
                url.searchParams.append('t', t)
                const response = await fetch(url.href)
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}))
                    setError(body.error || 'Invalid or expired link')
                    return
                }
                const json = (await response.json()) as SelfResponse
                setData(json)
                setForm({
                    name: json.speaker.name || '',
                    pronouns: json.speaker.pronouns || '',
                    jobTitle: json.speaker.jobTitle || '',
                    bio: json.speaker.bio || '',
                    company: json.speaker.company || '',
                    companyLogoUrl: json.speaker.companyLogoUrl || '',
                    geolocation: json.speaker.geolocation || '',
                    photoUrl: json.speaker.photoUrl || '',
                })
                setSocials(json.speaker.socials || [])
                setCustomFields((json.speaker.customFields as { [k: string]: string | boolean }) || {})
            } catch (err) {
                console.error(err)
                setError('Failed to load')
            } finally {
                setLoading(false)
            }
        })()
    }, [eventId, speakerId])

    const isEditable = (field: string) => data?.editableFields.includes(field)

    const handlePhotoUpload = async (file: File) => {
        if (!token) return
        setUploadingPhoto(true)
        try {
            const formData = new FormData()
            formData.append(file.name, file)
            const url = new URL(API_URL as string)
            url.pathname += `v1/${eventId}/speakers/${speakerId}/self/photo`
            url.searchParams.append('t', token)
            const response = await fetch(url.href, { method: 'POST', body: formData })
            const json = await response.json()
            if (!response.ok || !json.success) {
                setError(json.error || 'Upload failed')
                return
            }
            setForm((f) => ({ ...f, photoUrl: json.publicFileUrl }))
        } catch (err) {
            console.error(err)
            setError('Upload failed')
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!token || !data) return
        // `name` must stay a non-empty string. The backend rejects empty/null
        // name. Pre-validate here so the user gets a clear local error
        // instead of a generic 400 from schema validation.
        if (isEditable('name')) {
            const trimmed = (form.name || '').trim()
            if (trimmed.length === 0) {
                setError('Name cannot be empty')
                return
            }
        }
        // Filter empty social rows the speaker added but never filled in.
        // Anything with a name AND link survives. Backend strips unknown
        // names + non-http(s) links again as defense in depth.
        const cleanedSocials = socials.filter((s) => s.name && /^https?:\/\//i.test(s.link))
        if (isEditable('socials') && cleanedSocials.length !== socials.length) {
            const incomplete = socials.length - cleanedSocials.length
            setError(`${incomplete} social row(s) are missing a network or a valid https URL. Fix or remove them.`)
            return
        }
        setSubmitting(true)
        setError(null)
        try {
            const body: Record<string, unknown> = {}
            for (const field of TEXT_FIELDS) {
                if (isEditable(field)) {
                    const value = (form as Record<string, unknown>)[field]
                    if (field === 'name') {
                        // Always send as string (never null) — backend requires non-empty string.
                        body[field] = typeof value === 'string' ? value.trim() : value
                    } else {
                        body[field] = value === '' ? null : value
                    }
                }
            }
            if (isEditable('bio')) body.bio = form.bio === '' ? null : form.bio
            if (isEditable('socials')) body.socials = cleanedSocials
            if (data.editableCustomFieldIds.length > 0) {
                const filtered: { [k: string]: string | boolean } = {}
                for (const id of data.editableCustomFieldIds) {
                    if (customFields[id] !== undefined) filtered[id] = customFields[id]
                }
                if (Object.keys(filtered).length > 0) body.customFields = filtered
            }
            const url = new URL(API_URL as string)
            url.pathname += `v1/${eventId}/speakers/${speakerId}/self/submit`
            url.searchParams.append('t', token)
            const response = await fetch(url.href, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const json = await response.json()
            if (!response.ok || !json.success) {
                setError(json.error || 'Submit failed')
                return
            }
            setSubmitted(true)
        } catch (err) {
            console.error(err)
            setError('Submit failed')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <Container maxWidth="sm" sx={{ mt: 6 }}>
                <Typography>Loading…</Typography>
            </Container>
        )
    }
    if (error && !data) {
        return (
            <Container maxWidth="sm" sx={{ mt: 6 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        )
    }
    if (submitted) {
        return (
            <Container maxWidth="sm" sx={{ mt: 6 }}>
                <Paper sx={{ p: 4 }}>
                    <Typography variant="h5" mb={2}>
                        Changes submitted
                    </Typography>
                    <Typography color="text.secondary">
                        Thank you! Your changes are pending administrator approval. You will not see them on the public
                        site until they have been approved.
                    </Typography>
                </Paper>
            </Container>
        )
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h5" mb={1}>
                    Edit your profile — {data?.eventName}
                </Typography>
                <Typography color="text.secondary" mb={3}>
                    Your changes will be reviewed by an administrator before going live.
                </Typography>
                <Box component="form" onSubmit={handleSubmit}>
                    {TEXT_FIELDS.filter(isEditable).map((field) => (
                        <TextField
                            key={field}
                            fullWidth
                            margin="dense"
                            label={FIELD_LABELS[field] || field}
                            value={(form as Record<string, unknown>)[field] || ''}
                            onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                            disabled={submitting}
                            size="small"
                        />
                    ))}
                    {isEditable('bio') && (
                        <TextField
                            fullWidth
                            multiline
                            minRows={4}
                            margin="dense"
                            label="Bio"
                            value={form.bio || ''}
                            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                            disabled={submitting}
                            size="small"
                        />
                    )}
                    {isEditable('photoUrl') && (
                        <Box mt={1} mb={2}>
                            <Button variant="outlined" component="label" disabled={uploadingPhoto}>
                                {uploadingPhoto ? 'Uploading…' : 'Upload new photo'}
                                <input
                                    hidden
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0]
                                        if (f) handlePhotoUpload(f)
                                    }}
                                />
                            </Button>
                        </Box>
                    )}
                    {isEditable('socials') && (
                        <Box mt={2}>
                            <Typography variant="subtitle2" mb={1}>
                                Socials
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Pick a network from the list and paste the full link (https://…). The icon is derived
                                automatically.
                            </Typography>
                            {socials.map((s, i) => (
                                <Stack key={i} direction="row" spacing={1} mb={1} alignItems="center">
                                    <Select
                                        size="small"
                                        value={s.name || ''}
                                        displayEmpty
                                        onChange={(e) => {
                                            const nextName = e.target.value as string
                                            const known = KNOWN_SOCIALS.find((k) => k.name === nextName)
                                            const next = [...socials]
                                            next[i] = {
                                                ...next[i],
                                                name: nextName,
                                                icon: known?.icon || '',
                                            }
                                            setSocials(next)
                                        }}
                                        sx={{ minWidth: 140 }}>
                                        <MenuItem value="" disabled>
                                            Select…
                                        </MenuItem>
                                        {KNOWN_SOCIALS.map((known) => (
                                            <MenuItem key={known.name} value={known.name}>
                                                {known.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="https://..."
                                        label="URL"
                                        value={s.link}
                                        onChange={(e) => {
                                            const next = [...socials]
                                            next[i] = { ...next[i], link: e.target.value }
                                            setSocials(next)
                                        }}
                                    />
                                    <Button onClick={() => setSocials(socials.filter((_, j) => j !== i))}>
                                        Remove
                                    </Button>
                                </Stack>
                            ))}
                            <Button onClick={() => setSocials([...socials, { name: '', icon: '', link: '' }])}>
                                Add social
                            </Button>
                        </Box>
                    )}
                    {data && data.editableCustomFieldIds.length > 0 && (
                        <Box mt={2}>
                            <Typography variant="subtitle2" mb={1}>
                                Custom fields
                            </Typography>
                            {data.editableCustomFieldIds.map((id) => {
                                const value = customFields[id]
                                if (typeof value === 'boolean' || value === undefined) {
                                    return (
                                        <Stack key={id} direction="row" alignItems="center" spacing={1}>
                                            <Typography>{id}</Typography>
                                            <Switch
                                                checked={!!value}
                                                onChange={(e) =>
                                                    setCustomFields((c) => ({
                                                        ...c,
                                                        [id]: e.target.checked,
                                                    }))
                                                }
                                            />
                                        </Stack>
                                    )
                                }
                                return (
                                    <TextField
                                        key={id}
                                        fullWidth
                                        margin="dense"
                                        size="small"
                                        label={id}
                                        value={value}
                                        onChange={(e) => setCustomFields((c) => ({ ...c, [id]: e.target.value }))}
                                    />
                                )
                            })}
                        </Box>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ mt: 3 }}>
                        Submit for review
                    </Button>
                </Box>
            </Paper>
        </Container>
    )
}
