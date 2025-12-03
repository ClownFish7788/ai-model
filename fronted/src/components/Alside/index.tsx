import { useRef, useEffect, useState } from 'react'
import Button from '../Button'
import Item from '../Item'
import styles from './Alside.module.scss'
import VirtualList from '../VirtualList'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { toggleMessage } from '../../store/slices/Message'
import { addNewChat, cancelNewChat, initHistoryList } from '../../store/slices/History'
import useResend from '../../hooks/useResend'


const Alside = () => {
    const itemListRef = useRef<HTMLDivElement>(null)
    const [isScrolling, setIsScrolling] = useState(false)
    const scrollTimerRef = useRef<number | null>(null)
    const { historyList } = useAppSelector(state => state.history)
    const { name } = useAppSelector(state => state.message)
    const dispatch = useAppDispatch()

    // 开始时获取 history 列表
    useEffect(() => {
        const getHistoryList = async () => {
            try {
                const resp = await fetch("http://localhost:3001/api/history")
                const data = await resp.json()
                dispatch(initHistoryList(data.historyList))
            } catch {
                alert("历史数据获取失败")
            }
        }
        getHistoryList()
    }, [dispatch])

    // 滚动
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

    // 开启新对话
    const openNewChat = () => {
        if(historyList.length === 0) return
        const newName = "新对话"
        dispatch(addNewChat({
            id: "",
            name: newName
        }))
        dispatch(toggleMessage({
            id: "",
            name: newName,
            message: []
        }))
    }

    // 包装请求
    const fetchHistory = async (id: string) => {
        const resp = await fetch(`http://localhost:3001/api/history/${id}`)
        if(resp.ok) {
            return resp.json()
        }
        throw new Error("网络错误")
    }
    const {excute} = useResend({ callback: fetchHistory, maxRetries: 3 })

    // 获取数据
    const getMessageId = async (id: string) => {
        if(!id) return
        try {
            const data = await excute(id)
            console.log(data)
            // 如果开启新对话，但未聊天并回到历史聊天
            if(name === "新对话" && historyList[0].name === "新对话" && historyList[0].id === "") {
                dispatch(cancelNewChat())
            }
            dispatch(toggleMessage(data))
        }catch {
            alert("找不到该数据")
        }
    }

    useEffect(() => {
        console.log("历史列表:", historyList)
    }, [historyList])

    return (
        <div className={styles.Alside}>
            <header className={styles.header}>
                <div className={styles.upper}>
                    <h1>PTH</h1>
                    <div>&lt;-</div>
                </div>
                <div className={styles.lower}>
                    <Button content="开启新对话" callback={openNewChat} />
                </div>
            </header>
            <div 
                ref={itemListRef}
                className={`${styles.itemList} ${isScrolling ? styles.scrolling : ''}`}
            >
                <VirtualList isEqualHeight containerRef={itemListRef}>
                    {
                        historyList?.map(item => <Item 
                            id={item.id}
                            content={item.name}
                            key={item.id}
                            handleClick={getMessageId}
                        />)
                    }
                </VirtualList>
            </div>
            <footer className={styles.footer}>

            </footer>
        </div>
    )
}

export default Alside