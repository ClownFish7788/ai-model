import { useCallback, useEffect, useRef, useState } from "react"

type Props<T> = {
    items: T[]
    itemToRender: (item:T, index: number) => React.ReactNode
    isEqualHeight?: boolean
    estimateHeight?: number
    overScan?: number
    gap?: number
}

interface Position {
    index: number
    height: number
    top: number
    bottom: number
}

export const VirtualList = <T,>({
    items,
    itemToRender,
    isEqualHeight = false,
    estimateHeight = 40,
    overScan = 3,
    gap = 10
}: Props<T>) => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const positionsRef = useRef<Position[]>([])
    const lastMeasuredIndexRef = useRef<number>(-1)
    const [visibleRange, setVisibleRange] = useState({top: 0, end: 0})
    const [, forceRender] = useState({}) // 用于强制刷新
    // 初始化 - 当数据源改变时进行更新
    useEffect(() => {
        lastMeasuredIndexRef.current = -1
        positionsRef.current = []
        forceRender({})
    }, [items, estimateHeight])
    // 获取缓存数据位置
    const getCachedPosition = useCallback((index: number) => {
        const position = positionsRef.current
        if(index <= lastMeasuredIndexRef.current) return position[index]
        const startIndex = lastMeasuredIndexRef.current + 1
        // 从上一次最后更改的索引开始更改，避免每次O(n)复杂度
        for(let i = startIndex;i <= index; i++) {
            const prev = position[i - 1]
            const top = prev ? prev.bottom + gap : 0
            const height = position[i] ? position[i].height : estimateHeight
            position[i] = {index: i, height, top, bottom: height + top}
        } 
        lastMeasuredIndexRef.current = index
        return position[index]
    }, [estimateHeight, gap])
    // 获取总高度
    const getListHeight = useCallback(() => {
        if(items.length === 0) return 0
        const lastMeasuredIndex = lastMeasuredIndexRef.current
        if(lastMeasuredIndex === -1) {
            return items.length * (estimateHeight + gap) - gap
        }
        const lastMeasuredPosition = positionsRef.current[lastMeasuredIndex]
        const unmeasuredCount = items.length - 1 - lastMeasuredIndex
        if(unmeasuredCount > 0) {
            return lastMeasuredPosition.bottom + unmeasuredCount * (gap + estimateHeight)
        }
        // 因为是懒加载，所以可能存在position的长度小于items长度
        return getCachedPosition(items.length - 1).bottom
    }, [items.length, getCachedPosition, estimateHeight, gap])
    // 二分查找
    const getStartIndex = useCallback((scrollTop: number) => {
        const n = items.length
        let low = 0, high = n - 1
        let ans = 0
        while(low <= high) {
            const mid = Math.floor((low + high) / 2)
            const midBottom = getCachedPosition(mid).bottom
            if(midBottom === scrollTop) return mid + 1
            if(midBottom > scrollTop) {
                high = mid - 1
                ans = mid
            }
            else low = mid + 1
        }
        return ans
    }, [getCachedPosition, items.length])
    // 滚动与可视计算
    const calculateVisibleRange = useCallback(() => {
        const contianer = containerRef.current
        if(!contianer) return
        const { scrollTop, clientHeight } = contianer
        const start = getStartIndex(scrollTop)
        let end = start
        const maxScroll = clientHeight + scrollTop
        for(;end < items.length;end++) {
            const endBottom = getCachedPosition(end).bottom
            if(endBottom >= maxScroll) break
        }
        setVisibleRange(prev => {
            const newStart = Math.max(0, start - overScan)
            const newEnd = Math.min(items.length - 1, end + overScan)
            if(newStart === prev.top && newEnd === prev.end) return prev
            return {
                top: newStart,
                end: newEnd
            }
        })
    }, [getCachedPosition, getStartIndex, items.length, overScan])
    // 监听滚动
    useEffect(() => {
        const container = containerRef.current
        if(!container) return
        let ticking = false
        const handleScroll = () => {
            if(ticking) return
            requestAnimationFrame(() => {
                calculateVisibleRange()
                ticking = false
            })
            ticking = true
        }
        container.addEventListener('scroll', handleScroll, { passive: true })
        calculateVisibleRange() //初始计算
        return () => container.removeEventListener('scroll', handleScroll)
    }, [calculateVisibleRange])
    // item高度测量与更新
    const updateHeight = useCallback((entries: ResizeObserverEntry[]) => {
        if(isEqualHeight) return
        const position = positionsRef.current
        const contianer = containerRef.current
        let needUpdate = false
        let heightDiffAccumulator = 0
        let minChangedIndex = items.length - 1

        entries.forEach(entry => {
            const target = entry.target as HTMLElement
            const index = Number(target.dataset.index)
            // borderBoxSize 是现代浏览器的高性能 API，无需强制回流即可获取尺寸
            const height = entry.borderBoxSize?.[0]?.blockSize ?? target.getBoundingClientRect().height
            if(height === 0) return
            const oldHeight = getCachedPosition(index).height
            const diff = height - oldHeight
            if(diff != 0) {
                needUpdate = true
                position[index].height = height
                minChangedIndex = Math.min(minChangedIndex, index)
                if(contianer && position[index].top < contianer.scrollTop) {
                    heightDiffAccumulator += diff
                }
            }
        })
        if(!needUpdate) return
        for(let i = minChangedIndex;i <= lastMeasuredIndexRef.current; i++) {
            position[i].top = position[i-1] ? position[i-1].bottom + gap : 0
            position[i].bottom = position[i].top + position[i].height
        }
        if(contianer && heightDiffAccumulator !== 0) {
            contianer.scrollTop += heightDiffAccumulator
        }
        forceRender({})
    }, [isEqualHeight, getCachedPosition, items.length, gap])
    // 单例ResizeObserver
    const observerRef = useRef<ResizeObserver | null>(null)
    useEffect(() => {
        const observer = new ResizeObserver(updateHeight)
        observerRef.current = observer
        return () => observer.disconnect()
    }, [updateHeight])
    // 渲染逻辑
    const visibleItems = []
    const { top, end } = visibleRange
    for(let i = top;i <= end; i++) {
        if(i >= items.length) break
        const pos = getCachedPosition(i)
        visibleItems.push(
            <div
                key={i}
                data-index={i}
                ref={el => {
                    if(el && observerRef.current && !isEqualHeight) {
                        observerRef.current.observe(el)
                    }
                }}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${pos.top}px)`,
                }}
            >
                { itemToRender(items[i], i) }
            </div>
        )
    }
    return (
        <div    
            ref={containerRef}
            style={{ height: '100%', overflowY: 'auto', position: 'relative' }}
        >
            <div style={{ height: `${getListHeight()}px`, width: '100%' }}>
                {visibleItems}
            </div>
        </div>
    )
}