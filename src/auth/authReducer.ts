import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { RootState } from '../reduxStore'
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    setPersistence,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth'
import { getConferenceCenterAuth } from '../services/firebase'
import { MD5 } from '../utils/MD5'
import { browserLocalPersistence } from '@firebase/auth'

export interface UserState {
    email: string
    displayName: string
    avatarURL: string
    uid: string
}

export interface AuthError {
    error: string
    message: string
}

interface AuthState {
    user: null | UserState
    error: null | AuthError
    isLoggedIn: boolean
}

const user: UserState | null = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '') : null

const initialState: AuthState = user
    ? {
          isLoggedIn: true,
          error: null,
          user,
      }
    : ({ isLoggedIn: false, error: null, user: null } as AuthState)

export const listenAuthChange = (callback: (isLoggedIn: boolean) => void) => (dispatch: (object: any) => void) => {
    const auth = getConferenceCenterAuth()
    return onAuthStateChanged(auth, (user) => {
        callback(!!user)
        if (user) {
            const email = user.email as string
            dispatch({
                type: 'auth/login/fulfilled',
                payload: {
                    uid: user.uid,
                    displayName: email.split('@')[0],
                    email: email,
                    avatarURL: `https://www.gravatar.com/avatar/${MD5(email)}`,
                } as UserState,
            })
        }
    })
}

export const register = createAsyncThunk(
    'auth/register',
    async ({ email, password }: { email: string; password: string }, thunkAPI) => {
        const auth = getConferenceCenterAuth()
        return setPersistence(auth, browserLocalPersistence)
            .then(() => createUserWithEmailAndPassword(auth, email, password))
            .then((userCredential) => {
                localStorage.setItem('user', JSON.stringify({ email }))
                return {
                    uid: userCredential.user.uid,
                    displayName: email.split('@')[0],
                    email: email,
                    avatarURL: `https://www.gravatar.com/avatar/${MD5(email)}`,
                } as UserState
            })
            .catch((error) => {
                return thunkAPI.rejectWithValue({
                    error: error.code,
                    message: error.message,
                } as AuthError)
            })
    }
)

export const login = createAsyncThunk(
    'auth/login',
    async ({ email, password }: { email: string; password: string }, thunkAPI) => {
        const auth = getConferenceCenterAuth()

        return setPersistence(auth, browserLocalPersistence)
            .then(() => signInWithEmailAndPassword(auth, email, password))
            .then((userCredential) => {
                const user = userCredential.user
                localStorage.setItem('user', JSON.stringify({ email }))
                return {
                    uid: user.uid,
                    displayName: email.split('@')[0],
                    email: email,
                    avatarURL: `https://www.gravatar.com/avatar/${MD5(email)}`,
                } as UserState
            })
            .catch((error) => {
                return thunkAPI.rejectWithValue({
                    error: error.code,
                    message: error.message,
                } as AuthError)
            })
    }
)

export const logout = createAsyncThunk('auth/logout', async () => {
    await signOut(getConferenceCenterAuth())
    localStorage.removeItem('user')
    return Promise.resolve()
})

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(register.pending, (state) => {
                state.error = null
            })
            .addCase(register.fulfilled, (state, action) => {
                state.isLoggedIn = true
                state.user = action.payload
                state.error = null
            })
            .addCase(register.rejected, (state, action) => {
                state.isLoggedIn = false
                state.user = null
                state.error = action.payload as AuthError
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoggedIn = true
                state.user = action.payload
                state.error = null
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoggedIn = false
                state.user = null
                state.error = action.payload as AuthError
            })
            .addCase(logout.fulfilled, (state) => {
                state.isLoggedIn = false
                state.user = null
                state.error = null
            })
    },
})

export const selectIsUserLoggedInToConferenceCenter = (state: RootState) => state.auth.isLoggedIn
export const selectUserConferenceCenter = (state: RootState) => state.auth.user
export const selectUserIdConferenceCenter = (state: RootState) => state.auth.user?.uid
export const selectAuthCCError = (state: RootState) => state.auth.error
