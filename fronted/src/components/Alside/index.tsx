import { useRef, useEffect, useState } from 'react'
import Button from '../Button'
import Item from '../Item'
import styles from './Alside.module.scss'
import VirtualList from '../VirtualList'


const Alside = () => {
    const itemListRef = useRef<HTMLDivElement>(null)
    const [isScrolling, setIsScrolling] = useState(false)
    const scrollTimerRef = useRef<number | null>(null)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolling(true)
            
            // 清除之前的定时器
            if (scrollTimerRef.current) {
                clearTimeout(scrollTimerRef.current)
            }
            
            // 滚动停止后隐藏滚动条
            scrollTimerRef.current = setTimeout(() => {
                setIsScrolling(false)
            }, 500)
        }

        const listElement = itemListRef.current
        if (listElement) {
            listElement.addEventListener('scroll', handleScroll)
            
            return () => {
                listElement.removeEventListener('scroll', handleScroll)
                if (scrollTimerRef.current) {
                    clearTimeout(scrollTimerRef.current)
                }
            }
        }
    }, [])

    return (
        <div className={styles.Alside}>
            <header className={styles.header}>
                <div className={styles.upper}>
                    <h1>PTH</h1>
                    <div>&lt;-</div>
                </div>
                <div className={styles.lower}>
                    <Button content="FUCK YOU" />
                </div>
            </header>
            <div 
                ref={itemListRef}
                className={`${styles.itemList} ${isScrolling ? styles.scrolling : ''}`}
            >
                <VirtualList isEqualHeight containerRef={itemListRef}>
                    {
                        Array.from({length: 100}).map((_, index) => <Item key={index}/>)
                    }
                </VirtualList>
            </div>
            <footer className={styles.footer}>

            </footer>
        </div>
    )
}

export default Alside