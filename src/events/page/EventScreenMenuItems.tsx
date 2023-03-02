import { ListItemButton } from '@mui/material'
import * as React from 'react'
import EuroIcon from '@mui/icons-material/Euro'
import Icon from '@mdi/react'
import { mdiAccountVoice, mdiCalendarWeekend, mdiCogBox, mdiPresentation } from '@mdi/js'
import { useRoute } from 'wouter'
import { LinkBehavior } from '../../components/CCLink'

type CCListItemButton = {
    children: React.ReactNode
    href: string
}

const CCListItemButton = ({ children, href }: CCListItemButton) => {
    const [isActive] = useRoute(href)

    return (
        <ListItemButton selected={isActive} href={href} component={LinkBehavior}>
            {children}
        </ListItemButton>
    )
}

export const Menu = [
    {
        href: '/sponsors',
        icon: <EuroIcon />,
        name: 'Sponsors',
    },
    {
        href: '/sessions',
        icon: <Icon path={mdiPresentation} size={1} />,
        name: 'Session',
    },
    {
        href: '/speakers',
        icon: <Icon path={mdiAccountVoice} size={1} />,
        name: 'Speakers',
    },
    {
        href: '/schedule',
        icon: <Icon path={mdiCalendarWeekend} size={1} />,
        name: 'Schedule',
    },
    {
        href: '/settings',
        icon: <Icon path={mdiCogBox} size={1} />,
        name: 'Settings',
    },
]

export const EventScreenMenuItems = () => {
    return <></>
}
