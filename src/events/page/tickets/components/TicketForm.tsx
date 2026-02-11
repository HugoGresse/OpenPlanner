import { Event, Ticket } from '../../../../types'
import { FormContainer, TextFieldElement, SelectElement, useForm, SwitchElement } from 'react-hook-form-mui'
import { Grid, InputAdornment } from '@mui/material'

const currencyOptions = [
    { id: 'EUR', label: '€ EUR' },
    { id: 'USD', label: '$ USD' },
    { id: 'GBP', label: '£ GBP' },
    { id: 'CHF', label: 'CHF' },
]

const currencySymbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
}
import LoadingButton from '@mui/lab/LoadingButton'
import { SaveShortcut } from '../../../../components/form/SaveShortcut'

export type TicketFormProps = {
    event: Event
    ticket?: Ticket
    onSubmit: (ticket: Ticket) => void
}

export const TicketForm = ({ event, ticket, onSubmit }: TicketFormProps) => {
    const formContext = useForm({
        defaultValues: ticket
            ? ticket
            : {
                  name: '',
                  price: 0,
                  currency: 'EUR',
                  url: '',
                  ticketsCount: 0,
                  startDate: new Date(),
                  endDate: new Date(),
                  message: '',
                  available: true,
                  soldOut: false,
                  highlighted: false,
                  displayNewsletterRegistration: false,
              },
    })
    const { formState } = formContext
    const isSubmitting = formState.isSubmitting

    return (
        <FormContainer
            formContext={formContext}
            onSuccess={async (data) => {
                const newData = {
                    name: data.name,
                    price: Number(data.price) || 0,
                    currency: data.currency || 'EUR',
                    url: data.url || '',
                    ticketsCount: Number(data.ticketsCount) || 0,
                    startDate: data.startDate || '',
                    endDate: data.endDate || '',
                    message: data.message || '',
                    available: data.available ?? true,
                    soldOut: data.soldOut ?? false,
                    highlighted: data.highlighted ?? false,
                    displayNewsletterRegistration: data.displayNewsletterRegistration ?? false,
                }

                if (ticket) {
                    return onSubmit({
                        id: ticket.id,
                        ...newData,
                    } as Ticket)
                }
                return onSubmit(newData as Ticket)
            }}>
            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    {ticket && (
                        <TextFieldElement
                            margin="dense"
                            fullWidth
                            label="ID"
                            name="id"
                            variant="filled"
                            disabled={true}
                            size="small"
                        />
                    )}

                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        required
                        label="Ticket Type Name"
                        name="name"
                        variant="filled"
                        disabled={isSubmitting}
                    />

                    <Grid container spacing={2}>
                        <Grid item xs={8}>
                            <TextFieldElement
                                margin="dense"
                                fullWidth
                                required
                                label="Price"
                                name="price"
                                type="number"
                                variant="filled"
                                disabled={isSubmitting}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            {currencySymbols[formContext.watch('currency')] || '€'}
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <SelectElement
                                margin="dense"
                                fullWidth
                                required
                                label="Currency"
                                name="currency"
                                variant="filled"
                                disabled={isSubmitting}
                                options={currencyOptions}
                            />
                        </Grid>
                    </Grid>

                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        required
                        label="Sale URL"
                        name="url"
                        variant="filled"
                        disabled={isSubmitting}
                    />

                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        required
                        label="Tickets Count"
                        name="ticketsCount"
                        type="number"
                        variant="filled"
                        disabled={isSubmitting}
                    />

                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        required
                        label="Start Date"
                        name="startDate"
                        type="datetime-local"
                        variant="filled"
                        disabled={isSubmitting}
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        required
                        label="End Date"
                        name="endDate"
                        type="datetime-local"
                        variant="filled"
                        disabled={isSubmitting}
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextFieldElement
                        margin="dense"
                        fullWidth
                        multiline
                        minRows={3}
                        maxRows={40}
                        label="Message/Description"
                        name="message"
                        variant="filled"
                        disabled={isSubmitting}
                        size="small"
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <SwitchElement name="available" label="Available" disabled={isSubmitting} />
                    <SwitchElement name="soldOut" label="Sold Out" disabled={isSubmitting} />
                    <SwitchElement name="highlighted" label="Highlighted" disabled={isSubmitting} />
                    <SwitchElement
                        name="displayNewsletterRegistration"
                        label="Newsletter Registration"
                        disabled={isSubmitting}
                    />
                </Grid>
            </Grid>

            <Grid item xs={12}>
                <LoadingButton
                    type="submit"
                    disabled={formState.isSubmitting}
                    loading={formState.isSubmitting}
                    fullWidth
                    variant="contained"
                    sx={{ mt: 2, mb: 2 }}>
                    {ticket ? 'Save' : 'Add ticket'}
                </LoadingButton>
            </Grid>

            <SaveShortcut />
        </FormContainer>
    )
}
