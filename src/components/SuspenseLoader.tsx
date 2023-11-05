import React from 'react'
import { CircularProgress } from '@mui/material'
import { css, keyframes } from '@emotion/react'

const fadeIn = keyframes`
    from { opacity: 0 }
    to { opacity: 1 }
`

const containerStyle = css`
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    opacity: 0;
    transition: all 1s ease-in;
    animation-name: ${fadeIn};
    animation-delay: 500ms;
    animation-duration: 300ms;
    animation-fill-mode: forwards;
    width: 100%;
    height: 100vh;
    '& > div': {
       color: #550000;
    },
`

export const SuspenseLoader = () => {
    return (
        <div css={containerStyle}>
            <CircularProgress aria-label={'Loading...'} />
        </div>
    )
}
