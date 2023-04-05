import * as React from 'react'
import { useEffect, useState } from 'react'

export type AutoUpdateImageProps = {
    src: string
}
export const AutoUpdateImage = ({ src }: AutoUpdateImageProps) => {
    const [cacheDate, setCacheDate] = useState(Date.now())

    // TODO : detect focus
    useEffect(() => {
        if (!src) {
            return
        }
        const interval = setInterval(() => {
            setCacheDate(Date.now())
        }, 2000)
        return () => {
            clearInterval(interval)
        }
    }, [src])

    if (!src) {
        return null
    }

    return <img src={src + '?t=' + cacheDate} />
}
