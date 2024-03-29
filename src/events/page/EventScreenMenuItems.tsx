import { ListItemButton, ListItemIcon, ListItemText } from '@mui/material'
import * as React from 'react'
import { Icon } from '@mdi/react'
import {
    mdiAccountMultiple,
    mdiAccountVoice,
    mdiApi,
    mdiCalendarWeekend,
    mdiCashMultiple,
    mdiCogBox,
    mdiPresentation,
    mdiFrequentlyAskedQuestions,
} from '@mdi/js'
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
        icon: mdiCashMultiple,
        name: 'Sponsors',
    },
    {
        href: '/team',
        icon: mdiAccountMultiple,
        name: 'Team',
    },
    {
        href: '/faq',
        icon: mdiFrequentlyAskedQuestions,
        name: 'FAQ',
    },
    {
        href: '/sessions',
        icon: mdiPresentation,
        name: 'Sessions',
    },
    {
        href: '/speakers',
        icon: mdiAccountVoice,
        name: 'Speakers',
    },
    {
        href: '/schedule',
        icon: mdiCalendarWeekend,
        name: 'Schedule',
    },
    {
        href: '/settings',
        icon: mdiCogBox,
        name: 'Settings',
    },
    {
        href: '/api',
        icon: mdiApi,
        name: 'API & Deploys',
    },
]

export const EventScreenMenuItems = () => {
    return (
        <>
            {Menu.map((item) => (
                <CCListItemButton href={item.href} key={item.href}>
                    <ListItemIcon>
                        <Icon path={item.icon} size={1} />
                    </ListItemIcon>
                    <ListItemText primary={item.name} />
                </CCListItemButton>
            ))}
        </>
    )
}
