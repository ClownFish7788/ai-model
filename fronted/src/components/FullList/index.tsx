import styles from './FullList.module.scss'

type Props<T> = {
    items: T[]
    itemToRender: (item: T, index: number) => React.ReactNode
}

export const FullList = <T,>({ items, itemToRender }: Props<T>) => {
    return (
        <div className={styles.list}>
            {items.map((item, index) => (
                <div className={styles.item} key={index}>
                    {itemToRender(item, index)}
                </div>
            ))}
        </div>
    )
}
