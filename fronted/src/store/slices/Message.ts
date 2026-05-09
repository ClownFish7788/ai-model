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
>('Message/updateOldChat', async (updateId, thunkAPI) => {
    const { getState, dispatch, rejectWithValue } = thunkAPI
    const state = getState().message
    const { id, oldChat } = state
    let messages: Msg[] = []
    
    // 获取要上传的消息列表
    if(id === updateId) {
        messages = [...state.msgList]
    } else {
        const oldChatItem = oldChat.find(item => item.id === updateId)
        if(oldChatItem) {
            messages = [...oldChatItem.msgList]
        } else {
            return
        }
    }
    
    // 确保有消息才上传
    if (messages.length === 0) {
        return
    }
    
    try {
        // 准备上传数据
        const uploadData = {
            message: messages,
            name: messages[messages.length - 1].content.slice(0, 10) + (messages[messages.length - 1].content.length > 10 ? "..." : ""),
            time: Date.now().toString(),
            id: updateId
        }
        
        // 发送请求
        await submitData(uploadData)
        
        // 如果是旧聊天，删除它
        if(oldChat.some(item => item.id === updateId)) {
            dispatch(deleteOldChat(updateId))
        }
    } catch (err) {
        console.error("聊天记录上传失败:", err)
        return rejectWithValue(err instanceof Error ? err.message : "上传失败")
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