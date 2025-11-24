import styles from './Message.module.scss'

type Props = {
    content: string
}

const Message = ({content}: Props) => {
    return (
        <div className={styles.message}>
            <p className={styles.content}>{content}</p>
        </div>
    )
}

export default Message