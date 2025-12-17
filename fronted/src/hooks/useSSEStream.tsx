import { fetchEventSource } from "@microsoft/fetch-event-source"
import { useCallback, useEffect, useRef } from "react"

interface UseSSEStreamProps {
    id: string
    MessageCallback: (e:any, updateId: string) => void
    DoneCallback: (doneId: string) => void
    isPending: boolean
}

const useSSEStream = ({ id, MessageCallback, DoneCallback, isPending }: UseSSEStreamProps) => {
    const streamMap = useRef<Map<string, EventSource>>(new Map())
    const controllersMap = useRef<Map<string, AbortController>>(new Map())
    const callbackRef = useRef({ MessageCallback, DoneCallback })
    const prevIsPending = useRef(false) //记录isPending
    const prevId = useRef<null | string>(null)
    const activeId = useRef<string>("")
    // 关闭联系
    const closeConnection = useCallback((id: string) => {
        if(!controllersMap.current.has(id)) return
        const ctrl = controllersMap.current.get(id)
        ctrl?.abort()
    }, [])

    // 改变 id callbackRef
    useEffect(() => {
        activeId.current = id
        callbackRef.current = { MessageCallback, DoneCallback }
    }, [id, MessageCallback, DoneCallback])

    useEffect(() => {
        const controllers = controllersMap.current
        if(controllers.has(id)) return

        const startConnection = async (id: string, reTryTime = 5) => {
            if(controllersMap.current.has(id) || !id || reTryTime === 0) return
            const conMap = controllersMap.current
            const ctrl = new AbortController()
            conMap.set(id, ctrl)
            await fetchEventSource(`http://localhost:3001/sse?conversationId=${id}`, {
                method: "GET",
                headers: {
                    "content-Type": "text/event-stream"
                },
                signal: ctrl.signal,
                async onopen(response) {
                    if(response.ok && response.headers.get('content-type')?.includes('text/event-stream')) return 
                    if(response.status >= 400 && response.status < 500) {
                        alert("您未登录或权限不足")
                        throw new Error("您未登录或权限不足")
                    } else if(response.status >= 500) {
                        alert("服务器错误")
                        throw new Error("服务器错误")
                    }
                },
                onmessage(e) {
                    if(e.event === "done") {
                        callbackRef.current.DoneCallback(id)
                        if(id !== prevId.current) {
                            closeConnection(id)
                        }
                    } else {
                        callbackRef.current.MessageCallback(e, id)
                    }
                },
                onerror(err) {
                    const status = err.status
                    console.error("错误信息:", err.message)
                    if(status === 401 && status === 403) {
                        alert("您未登录或权限不足")
                        throw new Error("您未登录或权限不足")
                    } else if(status >= 500) {
                        alert("服务器错误")
                        throw new Error("服务器错误")
                    }
                    setTimeout(() => {
                        startConnection(id, reTryTime - 1)
                        console.log()
                    }, 1000)
                    throw new Error(err.message)
                },
            })
        }
        startConnection(id)

        return () => {
            const preId = prevId?.current || ""
            const preIsPending = prevIsPending.current
            if(!preIsPending && controllers.has(preId!)) {
                closeConnection(preId)
            }
        }
    }, [id, closeConnection])
    
    // 根据id 和 isPending变化改变ref
    useEffect(() => {
        prevIsPending.current = isPending
        prevId.current = id
    }, [id, isPending]) 

    // 组件卸载时关闭所有
    useEffect(() => {
        // 在组件卸载时会先将所有的ref.current变为null，再执行useEffect的清理函数
        const streams = streamMap.current
        return () => {
            streams.forEach(es => es.close())
            streams.clear()
        }
    }, [])
    return closeConnection
}

export default useSSEStream