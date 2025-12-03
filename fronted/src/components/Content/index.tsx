import { useEffect, useRef } from 'react'
import Input from '../Input'
import MarkdownMessage from '../MarkdownMessage'
import Message from '../Message'
import styles from './content.module.scss'
import { addMessage, assignChatId, changeChatName, pushContent, toggleIsPending } from '../../store/slices/Message'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { v4 as uuidv4 } from 'uuid'
import { type Msg } from '../../store/slices/Message'
import useAuthScroll from '../../hooks/useAuthScroll'
import { assignNewChat } from '../../store/slices/History'

const Content = () => {
    // 会话ID
    const conversationId = useRef<null | string>(null)
    const newMessage = useRef<string>("")

    const dispatch = useAppDispatch()
    const { msgList, isPending, id, name } = useAppSelector(state => state.message)
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

    // SSE
    const newContent = useRef("")
    useEffect(() => {
        // 初始化 id 和 state
        if(!id) {
            conversationId.current = uuidv4()
            dispatch(assignChatId(conversationId.current))
        } else {
            conversationId.current = id
        }
        const eventSource = new EventSource(`http://localhost:3001/sse?conversationId=${conversationId.current}`);
        
        eventSource.addEventListener('connected', (e) => {
            console.log(e.data);
        });
        
        eventSource.addEventListener('message', (e) => {
            const data = JSON.parse(e?.data)
            const content = data.content
            newContent.current = content
            if(content === '' && newMessage.current !== "") {
                newMessage.current = ""
            }else if(content !== ""){
                dispatch(pushContent(content))
                newMessage.current += content
            } else {
                dispatch(addMessage({
                    role: "system",
                    content: "",
                    id: uuidv4()
                }))
            }
        })
        eventSource.addEventListener('done', () => {
            dispatch(toggleIsPending(false))
        })

        eventSource.addEventListener('time', (e) => {
            console.log(e.data);
        });

        eventSource.onerror = (e) => {
            console.error('SSE error:', e);
        };
        
        // 清理函数：在组件卸载时关闭连接
        return () => {
            eventSource.close();
        };
    }, [dispatch, id])

    // 根据 isPending 来判断是否提交记录
    // 每当数据接收完毕提交
    useEffect(() => {
        if(isPending || msgList.length === 0) return
        const sumbitData = async () => {
            if(!id) return
            try {
                const resp = await fetch(`http://localhost:3001/api/history`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: msgList,
                        name: name,
                        time: Date.now().toString(),
                        id
                    })
                })
                console.log(resp)
            }catch {
                alert("上传失败")
            }
        }
        sumbitData()
    }, [isPending, msgList, id, name])

    return (
        <div className={styles.content}>
            <div className={styles.messages} ref={msgContainer}>
                {
                    msgList.map((item: Msg) => {
                        if(item.role === "user") return <Message content={item.content} key={item.id} />
                        return <MarkdownMessage content={item.content} key={item.id} newContent={newContent.current}  />
                    })
                }
            </div>
            <div className={styles.inputBar}>
                <Input sendMsg={sendMessage} />
            </div>
        </div>
    )
}

export default Content