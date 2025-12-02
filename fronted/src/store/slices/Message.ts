import { createSlice } from "@reduxjs/toolkit";

export type Msg = {
    role: "user" | "system",
    content: string,
    id: string
}


type InitialState = {
    msgList: Msg[],
    isPending: boolean
    id?: string,
    name?: string
}

const initialState: InitialState = {
    msgList: [],
    isPending: false,
    id: "",
    name: "新对话"
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
        },
        toggleMessage: (state, action) => {
            if(!action.payload) return
            const message = action.payload
            console.log(message)
            return {
                id: message.id,
                msgList: message.message,
                name: message.name,
                isPending: false
            }
        },
        assignChatId: (state, action) => {
            state.id = action.payload
        }, 
        changeChatName: (state, action) => {
            state.name = action.payload
        }
    }
})

export const { addMessage, toggleIsPending, pushContent, toggleMessage, assignChatId, changeChatName } = MessageStore.actions

export default MessageStore.reducer