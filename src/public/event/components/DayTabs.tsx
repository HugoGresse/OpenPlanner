import * as React from 'react'
import { Tabs, Tab } from '@mui/material'
import { DateTime } from 'luxon'

type DayTabsProps = {
    days: string[]
    selectedDay: string
    onDayChange: (event: React.SyntheticEvent, day: string) => void
}

export const DayTabs = ({ days, selectedDay, onDayChange }: DayTabsProps) => {
    return (
        <Tabs
            value={selectedDay}
            onChange={onDayChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ '& .MuiTab-root': { fontSize: '1.2rem' } }}>
            {days.map((day) => (
                <Tab key={day} value={day} label={DateTime.fromISO(day).toLocaleString({ weekday: 'long' })} />
            ))}
        </Tabs>
    )
}
