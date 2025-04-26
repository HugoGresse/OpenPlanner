import * as React from 'react'
import { useState, createContext, useContext } from 'react'
import {
    AppBar as MuiAppBar,
    AppBarProps as MuiAppBarProps,
    Box,
    Drawer,
    IconButton,
    styled,
    Toolbar,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material'
import { Menu } from '../EventScreenMenuItems'
import MenuIcon from '@mui/icons-material/Menu'
import { useRoute } from 'wouter'
import { Event } from '../../../types'
import { EventDrawerContent } from './EventDrawerContent'
import { EventFilesProvider } from '../../../context/EventFilesContext'
import { createPortal } from 'react-dom'

const drawerWidth: number = 240

interface AppBarProps extends MuiAppBarProps {
    open?: boolean
}

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}))

// Create context for portal targets
interface PortalContextType {
    rightToolbarElement: HTMLElement | null
    titleElement: HTMLElement | null
}

const PortalContext = createContext<PortalContextType>({
    rightToolbarElement: null,
    titleElement: null,
})

// Custom hooks for portals
export const useRightToolbarPortal = () => {
    const { rightToolbarElement } = useContext(PortalContext)
    return rightToolbarElement
}

export const useTitlePortal = () => {
    const { titleElement } = useContext(PortalContext)
    return titleElement
}

// Portal components
export const ToolbarRightPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const target = useRightToolbarPortal()
    return target ? createPortal(children, target) : null
}

export const TitlePortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const target = useTitlePortal()
    return target ? createPortal(children, target) : null
}

export type EventLayoutProps = {
    children: React.ReactNode
    event: Event
    customTitle?: string | React.ReactElement
}

export const EventLayout = ({ children, event, customTitle }: EventLayoutProps) => {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    const [_, firstParams] = useRoute('/:routeName')
    const [__, subParams] = useRoute('/:routeName/:subRoute')
    const [mobileOpen, setMobileOpen] = useState(true)
    const [isClosing, setIsClosing] = useState(false)

    // Portal targets refs
    const [rightToolbarElement, setRightToolbarElement] = useState<HTMLElement | null>(null)
    const [titleElement, setTitleElement] = useState<HTMLElement | null>(null)
    const [hasPortalTitle, setHasPortalTitle] = useState(false)

    // Listen for changes to the title element and check if it has children
    React.useEffect(() => {
        if (titleElement) {
            const observer = new MutationObserver((mutations) => {
                setHasPortalTitle(titleElement.childNodes.length > 0)
            })

            observer.observe(titleElement, { childList: true, subtree: true })

            return () => {
                observer.disconnect()
            }
        }
    }, [titleElement])

    const handleDrawerClose = () => {
        setIsClosing(true)
        setMobileOpen(false)
    }

    const toggleDrawer = () => {
        if (!isClosing) {
            setMobileOpen(!mobileOpen)
            setIsClosing(true)
        }
    }

    const handleDrawerTransitionEnd = () => {
        setIsClosing(false)
    }

    const menuItem = Menu.find((item) => {
        return `/${firstParams?.routeName}`.startsWith(item.href) || `/${subParams?.routeName}`.startsWith(item.href)
    })
    const routeName = menuItem ? menuItem.name : 'Loading...'
    const hideAppBar = menuItem?.href === '/schedule'

    return (
        <PortalContext.Provider value={{ rightToolbarElement, titleElement }}>
            <EventFilesProvider event={event}>
                <Box sx={{ display: 'flex' }}>
                    {!hideAppBar && (
                        <AppBar position="absolute" open={!isMobile || mobileOpen}>
                            <Toolbar
                                sx={{
                                    pr: '24px', // keep right padding when drawer closed
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <IconButton
                                        edge="start"
                                        color="inherit"
                                        aria-label="open drawer"
                                        onClick={toggleDrawer}
                                        sx={{ mr: 2, display: { sm: 'none' } }}>
                                        <MenuIcon />
                                    </IconButton>
                                    <Typography
                                        component="h1"
                                        variant="h6"
                                        color="inherit"
                                        noWrap
                                        ref={setTitleElement}
                                    />
                                    {!hasPortalTitle && (
                                        <Typography component="h1" variant="h6" color="inherit" noWrap>
                                            {routeName}
                                        </Typography>
                                    )}
                                </Box>
                                <div ref={setRightToolbarElement} />
                            </Toolbar>
                        </AppBar>
                    )}

                    <Box
                        component="nav"
                        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                        aria-label="mailbox folders">
                        <Drawer
                            variant="temporary"
                            open={mobileOpen}
                            onTransitionEnd={handleDrawerTransitionEnd}
                            onClose={handleDrawerClose}
                            ModalProps={{
                                keepMounted: true,
                            }}
                            sx={{
                                display: { xs: 'block', sm: 'none' },
                                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                            }}>
                            <EventDrawerContent event={event} />
                        </Drawer>
                        <Drawer
                            variant="permanent"
                            sx={{
                                display: { xs: 'none', sm: 'block' },
                                '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                            }}
                            open>
                            <EventDrawerContent event={event} />
                        </Drawer>
                    </Box>

                    <Box
                        component="main"
                        sx={{
                            flexGrow: 1,
                            height: '100vh',
                            width: { sm: `calc(100% - ${drawerWidth}px)` },
                            overflow: 'auto',
                        }}>
                        {!hideAppBar && <Toolbar />}
                        {children}
                    </Box>
                </Box>
            </EventFilesProvider>
        </PortalContext.Provider>
    )
}
