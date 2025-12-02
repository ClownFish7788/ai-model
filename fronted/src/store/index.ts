import { configureStore } from "@reduxjs/toolkit";
import MessageReducer from './slices/Message'
import HistoryReducer from './slices/History'

export const store = configureStore({
    reducer: {
        message: MessageReducer,
        history: HistoryReducer
    }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch