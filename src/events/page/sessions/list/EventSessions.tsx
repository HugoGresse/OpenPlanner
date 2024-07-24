import {
    Box,
    Button,
    Card,
    Container,
    Divider,
    FormControlLabel,
    FormGroup,
    Grid,
    IconButton,
    InputAdornment,
    Menu,
    MenuItem,
    Switch,
    TextField,
    Typography,
    Checkbox,
    Alert,
} from '@mui/material'
import * as React from 'react'
import { useMemo, useState } from 'react'
import { Event, Session } from '../../../../types'
import { useSessions } from '../../../../services/hooks/useSessions'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../../../components/FirestoreQueryLoaderAndErrorDisplay'
import { EventSessionItem } from '../EventSessionItem'
import { RequireConferenceHallConnections } from '../../../../components/RequireConferenceHallConnections'
import { SessionsImporterFromConferenceHallDialog } from '../components/SessionsImporterFromConferenceHallDialog'
import { Clear, ExpandMore } from '@mui/icons-material'
import { filterSessions } from './filterSessions'
import { FilterCategory } from './FilterCategory'
import { FilterFormat } from './FilterFormat'
import { GenerateSessionsTextContentDialog } from '../components/GenerateSessionsTextContentDialog'
import { useSearchParams } from '../../../../hooks/useSearchParams'
import { GenerateSessionsVideoDialog } from '../components/GenerateSessionsVideoDialog'
import { exportSessionsAction, SessionsExportType } from './actions/exportSessionsActions'
import { TeasingPostSocials } from '../../../actions/sessions/generation/generateSessionTeasingContent'
import { useMoveAllImagesToOpenPlannerStorage } from '../../../actions/speakers/useMoveAllImagesToOpenPlannerStorage'

export type EventSessionsProps = {
    event: Event
}
export const EventSessions = ({ event }: EventSessionsProps) => {
    const [searchParams, setSearchParams] = useSearchParams()
    const sessions = useSessions(event)
    const [sessionsImportOpen, setSessionsImportOpen] = useState(false)
    const [search, setSearch] = useState<string>('')
    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '')
    const [selectedFormat, setSelectedFormat] = useState<string>(searchParams.get('format') || '')
    const [onlyWithoutSpeaker, setOnlyWithoutSpeaker] = useState<boolean>(false)
    const [generateAnchorEl, setGenerateAnchorEl] = React.useState<null | HTMLElement>(null)
    const isGenerateMenuOpen = Boolean(generateAnchorEl)
    const [exportAnchorEl, setExportAnchorEl] = React.useState<null | HTMLElement>(null)
    const isExportMenuOpen = Boolean(exportAnchorEl)
    const [generateTextDialogOpen, setGenerateTextDialogOpen] = useState(false)
    const [generateVideoDialogOpen, setGenerateVideoDialogOpen] = useState(false)
    const [selectedNotAnnouncedOn, setSelectedNotAnnouncedOn] = useState<TeasingPostSocials[]>([])

    const handleNotAnnouncedOnChange = (social: TeasingPostSocials, checked: boolean) => {
        setSelectedNotAnnouncedOn((prev) => (checked ? [...prev, social] : prev.filter((s) => s !== social)))
    }

    const sessionsData = useMemo(() => sessions.data || [], [sessions.data])

    const moveAllImagesToOpenPlannerStorageState = useMoveAllImagesToOpenPlannerStorage(event, sessionsData)

    const displayedSessions = useMemo(() => {
        return filterSessions(sessionsData, {
            search,
            category: selectedCategory,
            format: selectedFormat,
            withoutSpeaker: onlyWithoutSpeaker,
            notAnnouncedOn: selectedNotAnnouncedOn,
        })
    }, [sessionsData, search, selectedCategory, selectedFormat, onlyWithoutSpeaker, selectedNotAnnouncedOn])

    const isFiltered = displayedSessions.length !== sessionsData.length

    const closeGenerateMenu = (type: string) => () => {
        setGenerateAnchorEl(null)
        switch (type) {
            case 'text':
                setGenerateTextDialogOpen(true)
                break
            case 'video':
                setGenerateVideoDialogOpen(true)
                break
            default:
                console.warn('Unknown type', type)
                break
        }
    }

    const closeExportMenu = (type: SessionsExportType | null) => () => {
        setExportAnchorEl(null)
        if (!type) return

        exportSessionsAction(sessionsData, displayedSessions, type)
    }

    if (sessions.isLoading) {
        return <FirestoreQueryLoaderAndErrorDisplay hookResult={sessions} />
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {moveAllImagesToOpenPlannerStorageState.shouldUpdateImageStorage && (
                <Alert variant="filled" severity="info" sx={{ marginBottom: 2 }}>
                    {moveAllImagesToOpenPlannerStorageState.total} session/speaker images are stored in OpenPlanner but
                    not in the storage bucket. This may cause issues due to the image not being accessible in some code
                    (ShortVid.io) or being moved later on making it unavailable.
                    <br />
                    You can migrate the images to OpenPlanner at once now:
                    <Button
                        variant="contained"
                        color="secondary"
                        disabled={moveAllImagesToOpenPlannerStorageState.isLoading}
                        onClick={() => {
                            moveAllImagesToOpenPlannerStorageState.moveAllImagesToOpenPlannerStorage()
                        }}>
                        Migrate images{' '}
                        {moveAllImagesToOpenPlannerStorageState.isLoading
                            ? `${moveAllImagesToOpenPlannerStorageState.progress}/${moveAllImagesToOpenPlannerStorageState.total}`
                            : ''}
                    </Button>
                    {moveAllImagesToOpenPlannerStorageState.error.length > 0 && (
                        <>
                            <Typography>Error(s):</Typography>
                            <ul>
                                {moveAllImagesToOpenPlannerStorageState.error.map((error) => (
                                    <li key={error}>{error}</li>
                                ))}
                            </ul>
                            <Typography>
                                Common errors could be linked to CORS issues, please check the console for more details.
                            </Typography>
                        </>
                    )}
                </Alert>
            )}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" marginBottom={1}>
                <Typography>
                    {isFiltered
                        ? `${displayedSessions.length}/${sessionsData.length} sessions`
                        : `${sessionsData.length} sessions`}
                </Typography>
                <RequireConferenceHallConnections event={event}>
                    <Button onClick={() => setSessionsImportOpen(true)}>Import proposals from ConferenceHall</Button>
                </RequireConferenceHallConnections>
                <Button onClick={(event) => setGenerateAnchorEl(event.currentTarget)} endIcon={<ExpandMore />}>
                    Generate
                </Button>
                <Menu
                    id="basic-menu"
                    anchorEl={generateAnchorEl}
                    open={isGenerateMenuOpen}
                    onClose={closeGenerateMenu('')}
                    MenuListProps={{
                        'aria-labelledby': 'basic-button',
                    }}>
                    <MenuItem onClick={closeGenerateMenu('text')}>Teasing for socials</MenuItem>
                    <MenuItem onClick={closeGenerateMenu('video')}>Teasing video using ShortVid.io</MenuItem>
                </Menu>
                <Button onClick={(event) => setExportAnchorEl(event.currentTarget)} endIcon={<ExpandMore />}>
                    Export
                </Button>
                <Menu anchorEl={exportAnchorEl} open={isExportMenuOpen} onClose={closeExportMenu(null)}>
                    {Object.entries(SessionsExportType).map(([key, value]) => (
                        <MenuItem key={key} onClick={closeExportMenu(value)}>
                            {value}
                        </MenuItem>
                    ))}
                </Menu>
                <Button href="/sessions/new" variant="contained">
                    Add session
                </Button>
            </Box>
            <Card sx={{ paddingX: 2 }}>
                <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            placeholder="Search"
                            fullWidth
                            size="small"
                            margin="normal"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                endAdornment: isFiltered ? (
                                    <InputAdornment position="start">
                                        <IconButton
                                            aria-label="Clear filters"
                                            onClick={() => {
                                                setSearch('')
                                                setSearchParams({})
                                                setSelectedCategory('')
                                                setSelectedFormat('')
                                            }}
                                            edge="end">
                                            <Clear />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null,
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <FilterCategory
                            event={event}
                            sessions={sessionsData}
                            selectedCategory={selectedCategory}
                            setSelectedCategory={(category) => {
                                setSelectedCategory(category)
                                setSearchParams({ category, format: selectedFormat })
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <FilterFormat
                            event={event}
                            sessions={sessionsData}
                            selectedFormat={selectedFormat}
                            setSelectedFormat={(format) => {
                                setSelectedFormat(format)
                                setSearchParams({ format, category: selectedCategory })
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', marginTop: 1 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    value={onlyWithoutSpeaker}
                                    onChange={(e) => setOnlyWithoutSpeaker(e.target.checked)}
                                />
                            }
                            label="Without speaker"
                        />
                        <Box display="flex" alignItems="center" ml={2}>
                            <Typography variant="body1" sx={{ marginRight: 2 }}>
                                Not announced on:
                            </Typography>
                            <FormGroup row>
                                {Object.values(TeasingPostSocials).map((social) => (
                                    <FormControlLabel
                                        key={social}
                                        control={
                                            <Checkbox
                                                checked={selectedNotAnnouncedOn.includes(social)}
                                                onChange={(event) =>
                                                    handleNotAnnouncedOnChange(social, event.target.checked)
                                                }
                                                size="small"
                                            />
                                        }
                                        label={social}
                                        sx={{ marginRight: 1 }}
                                    />
                                ))}
                            </FormGroup>
                        </Box>
                    </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                {displayedSessions.map((session: Session) => (
                    <EventSessionItem key={session.id} session={session} selectFormat={setSelectedFormat} />
                ))}
            </Card>
            {sessionsImportOpen && (
                <SessionsImporterFromConferenceHallDialog
                    event={event}
                    isOpen={sessionsImportOpen}
                    onClose={() => {
                        setSessionsImportOpen(false)
                    }}
                />
            )}
            {generateTextDialogOpen && (
                <GenerateSessionsTextContentDialog
                    isOpen={generateTextDialogOpen}
                    onClose={() => {
                        setGenerateTextDialogOpen(false)
                    }}
                    event={event}
                    sessions={displayedSessions}
                />
            )}
            {generateVideoDialogOpen && (
                <GenerateSessionsVideoDialog
                    isOpen={generateVideoDialogOpen}
                    onClose={() => {
                        setGenerateVideoDialogOpen(false)
                    }}
                    event={event}
                    sessions={displayedSessions}
                />
            )}
        </Container>
    )
}
