import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { RootState } from "..";
import { submitData } from "../../api";

export type Msg = {
    role: "user" | "system",
    content: string,
    id: string
}

interface OldChat {
    id: string
    isEnd: boolean
    name: string
    msgList: Msg[]
}

type InitialState = {
    msgList: Msg[]
    isPending: boolean
    id?: string
    name?: string
    oldChat: OldChat[]
}

const initialState: InitialState = {
    msgList: [],
    isPending: false,
    id: "",
    name: "新对话",
    oldChat: []
}

// 上传聊天记录
export const updateOldChat = createAsyncThunk<
    void, //返回类型
    string, //参数类型
    { state: RootState, rejectValue: string }
>('Message/updateOldChat', (updateId, thunkAPI) => {
    const state = thunkAPI.getState().message
    const { dispatch, rejectWithValue } = thunkAPI
    const { id, oldChat } = state
    const messages = []
    if(id === updateId) {
        messages.push(...state.msgList)
    } else if(oldChat.some(item => item.id === updateId)) {
        const oldChatList = oldChat.filter(item => item.id === updateId)
        messages.push(...oldChatList[0].msgList)
    } else return
    // 网络提交
    try {
        submitData({
            message: messages,
            name: messages[messages.length - 1].content.slice(0, 5),
            time: Date.now().toString(),
            id: updateId
        })
    } catch (err) {
        rejectWithValue(err as string)
        console.error("上传失败", err)
    }
    if(oldChat.some(item => item.id === updateId)) {
        dispatch(deleteOldChat(updateId))
    }
})

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
            const { content, id } = action.payload
            console.log(action)
            if(id === state.id) {
                state.msgList[state.msgList.length - 1].content += content
            } else if(state.oldChat.some(item => item.id === id)) {
                const oldChat = state.oldChat.find(item => item.id === id)
                if(oldChat?.msgList && oldChat.msgList.length > 0) {
                    oldChat.msgList[oldChat.msgList.length - 1].content += content
                }
            }
        },
        toggleMessage: (state, action) => {
            const message = action.payload
            if(!action.payload || state.id === message.id) return
            // 如果前聊天未输出完
            if(state.isPending && state.id && !state.oldChat.some(item => item.id === state.id)) {
                state.oldChat.push({
                    id: state.id,
                    isEnd: false,
                    name: state?.name || "新对话",
                    msgList: state.msgList
                })
            } 
            // 当前聊天在oldChat中
            const index = state.oldChat.findIndex(item => item.id === message.id)
            if(index !== -1) {
                const cachedChat = state.oldChat[index]
                state.id = cachedChat.id
                state.isPending = cachedChat.isEnd
                state.msgList = cachedChat.msgList
                state.name = cachedChat.name
                state.oldChat.splice(index, 1)
            } else {
                state.id = message.id
                state.isPending = false
                state.name = message.name || "新对话"
                state.msgList = message.message
            }
        },
        assignChatId: (state, action) => {
            state.id = action.payload
        }, 
        changeChatName: (state, action) => {
            state.name = action.payload
        },
        deleteOldChat: (state, action) => {
            const chatId = action.payload
            if(!state.oldChat.some(item => item.id === chatId)) return
            state.oldChat = state.oldChat.filter(item => item.id !== chatId)
        },
        handleOldChatMsgList: (state, action) => {
            const { id, message } = action.payload
            const index = state.oldChat.findIndex(item => item.id === id)
            if(index == -1 || !message) return
            state.oldChat[index].msgList = message
        }
    }
})

export const {
    addMessage,
    toggleIsPending,
    pushContent,
    toggleMessage,
    assignChatId,
    changeChatName,
    deleteOldChat
} = MessageStore.actions

export default MessageStore.reducer