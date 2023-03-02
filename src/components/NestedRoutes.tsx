import * as React from 'react'
import { Router, useLocation, useRouter } from 'wouter'

// from https://github.com/molefrog/wouter#are-relative-routes-and-links-supported
export const NestedRoutes = (props: { children: React.ReactNode; base: string }) => {
    const router = useRouter()
    const [parentLocation] = useLocation()

    const nestedBase = `${router.base}${props.base}`

    // don't render anything outside of the scope
    if (!parentLocation.startsWith(nestedBase)) return null

    console.log('render subroute')

    // we need key to make sure the router will remount when base changed
    return (
        <Router base={nestedBase} key={nestedBase}>
            {props.children}
        </Router>
    )
}
