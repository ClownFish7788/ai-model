import { configureStore } from "@reduxjs/toolkit";
import MessageReducer from './slices/Message'

export const store = configureStore({
    reducer: {
        message: MessageReducer
    }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch