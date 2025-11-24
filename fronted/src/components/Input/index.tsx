import { useDeferredValue, useState } from 'react'
import Button from '../Button'
import styles from './input.module.scss'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { toggleIsPending } from '../../store/slices/Message'

type Props = {
    sendMsg: (msg: string) => void
}

const Input = ({sendMsg}: Props) => {
    const [message, setMessage] = useState("")
    const deferMessage = useDeferredValue(message)
    const { isPending } = useAppSelector(state => state.message)
    const dispatch = useAppDispatch()
    // 发送消息
    const sendMessage = () => {
        if(isPending || message.trim().length === 0) return
        sendMsg(message)
        setMessage("")
        dispatch(toggleIsPending(true))
    }

    const onKeyUpSendMessage = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if(e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className={styles.input}>
            <div className={styles.content}>
                <textarea
                    className={styles.textarea}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={onKeyUpSendMessage}
                    ></textarea>
            </div>
            <footer className={styles.footer}>
                <div className={styles.left}>
                    <Button content="深度思考" type='switch' />
                    <Button content="联网搜索" type='switch' />
                </div>
                <div className={styles.right}>
                    <Button content='发送' selected={ deferMessage.length > 0 && !isPending } callback={sendMessage} />
                </div>
            </footer>
        </div>      
    )
}

export default Input