import * as React from 'react'
import { Link as RouterLink, LinkProps } from 'wouter'

// see https://github.com/molefrog/wouter/issues/287
// @ts-ignore
export const CCLink = React.forwardRef<any, Omit<LinkProps, 'to'>>((props, ref) => <RouterLink ref={ref} />)
