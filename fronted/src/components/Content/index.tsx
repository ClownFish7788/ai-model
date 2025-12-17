import { startTransition, useCallback, useDeferredValue, useEffect, useRef } from 'react'
import Input from '../Input'
import MarkdownMessage from '../MarkdownMessage'
import Message from '../Message'
import styles from './content.module.scss'
import { addMessage, assignChatId, changeChatName, pushContent, toggleIsPending, updateOldChat } from '../../store/slices/Message'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { v4 as uuidv4 } from 'uuid'
import { type Msg } from '../../store/slices/Message'
import useAuthScroll from '../../hooks/useAuthScroll'
import { assignNewChat } from '../../store/slices/History'
import VirtualList from '../VirtualList'
import { submitData } from '../../api'
import useSSEStream from '../../hooks/useSSEStream'

const Content = () => {
    // 会话ID
    const conversationId = useRef<null | string>(null)
    const newMessage = useRef<string>("")

    const dispatch = useAppDispatch()
    const { msgList, isPending, id, name } = useAppSelector(state => state.message)
    const defferedMd = useDeferredValue(msgList)
    const message = useRef("")
    const msgContainer = useRef<null | HTMLDivElement>(null)
    // 发送消息
    const sendMessage = async (msg: string) => {
        if(!conversationId.current) {
            console.error("未连接")
            return
        }
        message.current = msg
        const newMsg = {
            role: "user",
            content: msg,
            id: uuidv4()
        }
        try {
            // 去除id
            const newMsgList = [...msgList, newMsg]
            const list = newMsgList.map(({role, content}) => ({role, content}))
            // 发送请求
            const resp = await fetch("http://localhost:3001/api/chat", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: conversationId.current,
                    messages: list
                })
            })
            if(!resp.ok) {
                dispatch(toggleIsPending(true))
                throw new Error("发送失败")
            }
        }catch {
            alert("消息推送失败，请重试")
            dispatch(toggleIsPending(false))
            console.error('消息推送失败')
        }
        dispatch(addMessage(newMsg))
        const newName = msg.length > 10 ? msg.slice(0, 8) + "..." : msg
        dispatch(changeChatName(newName))
        dispatch(assignNewChat({
            id: conversationId.current,
            name: newName
        }))
        dispatch(addMessage({
            role: "system",
            content: "",
            id: uuidv4()
        }))
        // 发送成功自动锁定底部
        const container = msgContainer.current
        if(container) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight - container.clientHeight
            })
        }
    }

    // 自动锁定最底层
    useAuthScroll(msgContainer, msgList, isPending)

    // SSE（redux + hook）
    const MessageCallback = (e: any, updateId: string) => {
        const data = JSON.parse(e?.data)
            const content = data.content

            if(content === '' && newMessage.current !== "") {
                newMessage.current = ""
            }else if(content !== ""){
                startTransition(() => {
                    dispatch(pushContent({content, id: updateId}))
                    console.log(1)
                })
                newMessage.current += content
            } else {
                startTransition(() => {
                    dispatch(addMessage({
                        role: "system",
                        content: "",
                        id: uuidv4()
                    }))
                })
            }
    }
    const DoneCallback = useCallback((doneId: string) => {
        dispatch(toggleIsPending(false))
        // done之后自动提交
        if(doneId) dispatch(updateOldChat(doneId))
    }, [dispatch])
    useEffect(() => {
        if(!id) {
            conversationId.current = uuidv4()
            dispatch(assignChatId(conversationId.current))
        } else {
            conversationId.current = id
        }
    }, [id, dispatch])
    useSSEStream({
        id: id || conversationId.current || "",
        MessageCallback,
        DoneCallback,
        isPending
    })

    // 根据 isPending 来判断是否提交记录
    // 每当数据接收完毕提交
    useEffect(() => {
        if(isPending || msgList.length === 0) return
        const data = {
            message: msgList,
            name: name,
            time: Date.now().toString(),
            id
        }
        try {
            submitData({
                ...data,
                name: data.name || "新对话",
                id: data.id || ""
            })
        } catch(err) {
            console.error("上传失败", err)
        }
    }, [isPending, msgList, id, name])

    return (
        <div className={styles.content}>
            <div className={styles.messages} ref={msgContainer}>
                <VirtualList isEqualHeight={false} containerRef={msgContainer}>
                    {
                        defferedMd.map((item: Msg) => {
                            if(item.role === "user") return <Message content={item.content} key={item.id} />
                            return <MarkdownMessage content={item.content} key={item.id} />
                        })
                    }
                </VirtualList>
            </div>
            <div className={styles.inputBar}>
                <Input sendMsg={sendMessage} />
            </div>
        </div>
    )
}

export default Content