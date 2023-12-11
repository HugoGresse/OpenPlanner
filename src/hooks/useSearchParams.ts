import { useCallback, useMemo, useRef } from 'react'
import { navigate, useSearch } from 'wouter/use-location'

// Based on react-router: https://github.com/remix-run/react-router/blob/main/packages/react-router-dom/index.tsx

/**
 * Copied from https://github.com/molefrog/wouter/issues/368#issuecomment-1807545003
 * Thank you!
 */

type ParamKeyValuePair = [string, string]

type URLSearchParamsInit = string | ParamKeyValuePair[] | Record<string, string | string[]> | URLSearchParams

export function createSearchParams(init: URLSearchParamsInit = ''): URLSearchParams {
    return new URLSearchParams(
        typeof init === 'string' || Array.isArray(init) || init instanceof URLSearchParams
            ? init
            : Object.keys(init).reduce((memo, key) => {
                  const value = init[key]
                  return memo.concat(Array.isArray(value) ? value.map((v) => [key, v]) : [[key, value]])
              }, [] as ParamKeyValuePair[])
    )
}

export function getSearchParamsForLocation(locationSearch: string, defaultSearchParams: URLSearchParams | null) {
    const searchParams = createSearchParams(locationSearch)

    if (defaultSearchParams) {
        // Use `defaultSearchParams.forEach(...)` here instead of iterating of
        // `defaultSearchParams.keys()` to work-around a bug in Firefox related to
        // web extensions. Relevant Bugzilla tickets:
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1414602
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1023984
        defaultSearchParams.forEach((_, key) => {
            if (!searchParams.has(key)) {
                defaultSearchParams.getAll(key).forEach((value) => {
                    searchParams.append(key, value)
                })
            }
        })
    }

    return searchParams
}

export function useSearchParams(defaultInit?: URLSearchParamsInit) {
    if (typeof URLSearchParams === 'undefined') {
        console.warn(
            `You cannot use the \`useSearchParams\` hook in a browser that does not ` +
                `support the URLSearchParams API. If you need to support Internet ` +
                `Explorer 11, we recommend you load a polyfill such as ` +
                `https://github.com/ungap/url-search-params\n\n` +
                `If you're unsure how to load polyfills, we recommend you check out ` +
                `https://polyfill.io/v3/ which provides some recommendations about how ` +
                `to load polyfills only for users that need them, instead of for every ` +
                `user.`
        )
    }

    const defaultSearchParamsRef = useRef(createSearchParams(defaultInit))
    const hasSetSearchParamsRef = useRef(false)

    const search = useSearch()
    const searchParams = useMemo(
        () =>
            // Only merge in the defaults if we haven't yet called setSearchParams.
            // Once we call that we want those to take precedence, otherwise you can't
            // remove a param with setSearchParams({}) if it has an initial value
            getSearchParamsForLocation(search, hasSetSearchParamsRef.current ? null : defaultSearchParamsRef.current),
        [search]
    )

    const setSearchParams = useCallback(
        (
            nextInit: URLSearchParamsInit | ((prev: URLSearchParams) => URLSearchParamsInit),
            navigateOpts?: Parameters<typeof navigate>['1']
        ) => {
            const newSearchParams = createSearchParams(
                typeof nextInit === 'function' ? nextInit(searchParams) : nextInit
            )
            hasSetSearchParamsRef.current = true
            navigate('?' + newSearchParams, navigateOpts)
        },
        [searchParams]
    )

    return [searchParams, setSearchParams] as const
}
