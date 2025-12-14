import { useCallback, useEffect, useRef } from "react"

interface UseSSEStreamProps {
    id: string
    MessageCallback: (e:any) => void
    DoneCallback: () => void
    isPending: boolean
    // ConnectedCallback?: (e:any) => void
    // TimeCallback?: (e:any) => void
}

const useSSEStream = ({ id, MessageCallback, DoneCallback, isPending }: UseSSEStreamProps) => {
    const streamMap = useRef<Map<string, EventSource>>(new Map())
    const callbackRef = useRef({ MessageCallback, DoneCallback })
    const prevIsPending = useRef(false) //记录isPending
    const prevId = useRef<null | string>(null)
    const activeId = useRef<string>("")
    // 关闭联系
    const closeConnection = useCallback((id: string) => {
        if(!streamMap.current.has(id)) return
        const es = streamMap.current.get(id)
        if(es) es.close()
        streamMap.current.delete(id)
    }, [])

    // 改变 id callbackRef
    useEffect(() => {
        activeId.current = id
        callbackRef.current = { MessageCallback, DoneCallback }
    }, [id, MessageCallback, DoneCallback])
    
    useEffect(() => {
        const streams = streamMap.current
        if(streams.has(id)) return
        const eventSource = new EventSource(`http://localhost:3001/sse?conversationId=${id}`)
        const handleMessage = (e) => {
            callbackRef.current.MessageCallback(e)
        }
        const handleDone = () => {
            callbackRef.current.DoneCallback()
            if(id !== activeId.current) {
                closeConnection(id)
            }
        }
        eventSource.addEventListener('message', handleMessage)
        eventSource.addEventListener('done', handleDone)
        streams.set(id, eventSource)

        return () => {
            const preId = prevId?.current || ""
            const preIsPending = prevIsPending.current
            if(!preIsPending && streams.has(preId!)) {
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
        return () => {
            streamMap.current.forEach(es => es.close())
            streamMap.current.clear()
        }
    }, [])
    return closeConnection
}

export default useSSEStream