import * as React from 'react'
import { useState } from 'react'
import { ConferenceHallProposal, ConferenceHallProposalState } from '../../types'
import { FirestoreQueryLoaderAndErrorDisplay } from '../../components/FirestoreQueryLoaderAndErrorDisplay'
import { Box, Chip, Typography } from '@mui/material'
import LoadingButton from '@mui/lab/LoadingButton'
import { DataGrid, GridColDef, GridToolbarQuickFilter, useGridApiContext } from '@mui/x-data-grid'
import { UseQueryResult } from 'react-query'
import { DocumentData } from '@firebase/firestore'

export type ConferenceHallProposalsPickerProps = {
    proposals: UseQueryResult<DocumentData>
    onSubmit: (proposals: ConferenceHallProposal[]) => void
}

const columns: GridColDef[] = [
    { field: 'title', headerName: 'Title', width: 350 },
    { field: 'state', headerName: 'State', width: 130 },
]

const ToolBarBis = (props: any) => {
    const apiRef = useGridApiContext()

    const [selectedChip, setSelectedChip] = useState<ConferenceHallProposalState[]>([])
    const selectAllClick = (selectedState: ConferenceHallProposalState) => () => {
        const pastSelectedRows = apiRef.current.getSelectedRows()
        const rows = apiRef.current.getRowModels()

        if (selectedChip.includes(selectedState)) {
            // Remove proposals being selected with the selectedState
            setSelectedChip(selectedChip.filter((s) => s !== selectedState))

            const rowsToSelect = Array.from(pastSelectedRows.values())
                .filter((r) => r.state !== selectedState)
                .map((r) => r.id)
            apiRef.current.setRowSelectionModel(rowsToSelect)
        } else {
            setSelectedChip([...selectedChip, selectedState])

            const rowsToSelect = Array.from(rows.values())
                .filter((r) => r.state === selectedState)
                .map((r) => r.id)
                .concat(Array.from(pastSelectedRows.keys()))

            apiRef.current.setRowSelectionModel(rowsToSelect)
        }
    }

    return (
        <Box display="flex" padding={1}>
            <GridToolbarQuickFilter {...props} />
            {Object.values(ConferenceHallProposalState).map((v) => (
                <Chip
                    label={v}
                    key={v}
                    color={selectedChip.includes(v) ? 'primary' : undefined}
                    onClick={selectAllClick(v)}
                />
            ))}
        </Box>
    )
}

export const ConferenceHallProposalsPicker = ({ proposals, onSubmit }: ConferenceHallProposalsPickerProps) => {
    const [selectedRow, setSelectedRow] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    const proposalsData = (proposals.data as ConferenceHallProposal[]) || []

    return (
        <>
            <FirestoreQueryLoaderAndErrorDisplay hookResult={proposals} />

            {proposalsData.length && (
                <Box>
                    <Typography>Total proposals: {proposalsData.length}</Typography>

                    <DataGrid
                        rows={proposalsData}
                        columns={columns}
                        checkboxSelection
                        autoHeight={true}
                        density="compact"
                        initialState={{
                            pagination: {
                                paginationModel: {
                                    pageSize: 20,
                                },
                            },
                        }}
                        slots={{ toolbar: ToolBarBis }}
                        slotProps={{
                            toolbar: {
                                quickFilterProps: { debounceMs: 500 },
                            },
                        }}
                        rowSelectionModel={selectedRow}
                        onRowSelectionModelChange={(rowSelectionModel) => {
                            setSelectedRow(rowSelectionModel as string[])
                        }}
                    />

                    <LoadingButton
                        type="submit"
                        title="Import proposals & create ConferenceCenter event"
                        disabled={loading}
                        loading={loading}
                        variant="contained"
                        sx={{ marginTop: 2 }}
                        onClick={async () => {
                            setLoading(true)
                            await onSubmit(proposalsData.filter((p) => selectedRow.includes(p.id)))
                            setLoading(false)
                        }}>
                        {selectedRow.length > 0
                            ? `Import ${selectedRow.length} proposals & create Conference Center event`
                            : 'Create event without proposals'}
                    </LoadingButton>
                </Box>
            )}
        </>
    )
}
