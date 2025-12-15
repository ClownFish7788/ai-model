import classNames from 'classnames'
import styles from './Item.module.scss'

type Props = {
    content?: string
    selected?: boolean
    id?: string,
    handleClick: (id: string) => void
}

const Item = ({content = "新对话", selected = false, id = "", handleClick}: Props) => {

    return (
        <div className={classNames(styles.item, selected ? styles.selected : styles.noSelected)} onClick={() => handleClick(id)}>
            {content}
            <div className={styles.more}></div>
        </div>
    )
}

export default Item