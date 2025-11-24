import { createSlice } from "@reduxjs/toolkit";

export type Msg = {
    role: "user" | "system",
    content: string,
    id: string
}


type InitialState = {
    msgList: Msg[],
    isPending: boolean
}

const initialState: InitialState = {
    msgList: [],
    isPending: false
}

const MessageStore = createSlice({
    name: "Message",
    initialState,
    reducers: {
        addMessage: (state, action) => {
            const newMsg = action.payload
            state.msgList.push(newMsg)
        },
        toggleIsPending: (state, action) => {
            state.isPending = action.payload
        },
        pushContent: (state, action) => {
            const content = action.payload
            state.msgList[state.msgList.length - 1].content += content
        } 
    }
})

export const { addMessage, toggleIsPending, pushContent } = MessageStore.actions

export default MessageStore.reducer