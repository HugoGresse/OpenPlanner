import * as React from 'react'
import { Link as WouterLink, LinkProps as WouterLinkProps } from 'wouter'

// redeclaring wouter's Link to for ref forwarding
// see https://github.com/molefrog/wouter/issues/287
const RouterLink = WouterLink as React.FunctionComponent<WouterLinkProps & React.RefAttributes<HTMLAnchorElement>>

export const LinkBehavior = React.forwardRef<
    HTMLAnchorElement,
    Omit<Omit<WouterLinkProps, 'to'>, 'href'> & { href: string }
>((props, ref) => {
    const { href, ...other } = props
    // Map href (MUI) -> to (react-router)
    return <RouterLink ref={ref} to={href} {...other} asChild={false} />
})
