import { createSlice } from "@reduxjs/toolkit";


export type History = {
    id: string
    name: string
}

type InitialState = {
    historyList: History[]
}

const initialState: InitialState = {
    historyList: []
}

const HistoryStore = createSlice({
    name: "History",
    initialState,
    reducers: {
        addNewChat: (state, action) => {
            if(state.historyList.length > 0 && state.historyList[0].id === "") return
            state.historyList.unshift(action.payload)
        },
        assignNewChat: (state, action) => {
            if(state.historyList.length <= 0) return 
            state.historyList[0] = {
                id: action.payload.id,
                name: action.payload.name
            }
        },
        initHistoryList: (state, action) => {
            const list = action.payload
            if(list.length <= 0) return
            const historyList = list.map((item: History) => {
                return {
                    id: item?.id || "",
                    name: item.name
                }
            })
            state.historyList = historyList
        },
        cancelNewChat: (state) => {
            state.historyList.shift()
        }
    }
})

export const { addNewChat, assignNewChat, initHistoryList, cancelNewChat } = HistoryStore.actions

export default HistoryStore.reducer
