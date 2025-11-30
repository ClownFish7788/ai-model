import React, { useCallback, useEffect, useMemo, useState } from "react"

type Props = {
    isEqualHeight: boolean
    containerRef: React.RefObject<HTMLElement | null>
    children: React.ReactNode | React.ReactNode[]
    overScan?: number //预渲染个数
    estimatedHeight?: number
}

interface PositionInfo {
  index: number; // 项目索引
  top: number; // 距离顶部的距离
  height: number; // 项目高度
  bottom: number; // 底部位置 (top + height)
}

type MeasurableElement = React.ReactElement<{
    ref?: React.Ref<HTMLElement>
}>

const VirtualList = ({isEqualHeight, containerRef, children, overScan = 3, estimatedHeight = 40}: Props) => {
    const [visibleRange, setVisibleRange] = useState({start:0, end: 0})  // 记录当前视口位置
    const [positions, setPositions] = useState<PositionInfo[]>([]) // 记录每个项目位置
    const [containerHeight, setContainerHeight] = useState(0) //虚拟列表总高度
    const [heightMap, setHeightMap] = useState<Map<number, number>>(new Map())

    // 将 children 转换成数组
    const items = useMemo(() => React.Children.toArray(children) as unknown as MeasurableElement[], [children])

    // 计算每个元素的具体位置
    useEffect(() => {
        const newPositions: PositionInfo[] = []
        if(isEqualHeight) {
            for(let i = 0;i < items.length; i++) {
                const top = i * estimatedHeight
                newPositions.push({
                    index: i,
                    top,
                    height: estimatedHeight,
                    bottom: top + estimatedHeight
                })
            }
        } else {
            let top = 0
            for(let i = 0;i < items.length; i++) {
                const height = heightMap.get(i) || estimatedHeight
                newPositions.push({
                    index: i,
                    top,
                    height,
                    bottom: top + height
                })
                top += height
            }
        }
        setPositions(newPositions)
    }, [isEqualHeight, estimatedHeight, items, heightMap])

    // 计算虚拟列表总高度
    useEffect(() => {
        const length = positions.length
        if(length > 0) {
            setContainerHeight(positions[length-1].bottom)
        } else {
            setContainerHeight(0)
        }
    }, [positions])
    
    // 计算可见范围（二分法）
    const calculateVisibleRange = useCallback(() => {
        const container = containerRef.current
        if(!container || positions.length <= 0) return

        const scrollTop = container?.scrollTop
        const clientHeight = container?.clientHeight
        const scrollBottom = scrollTop + clientHeight

        let startIndex = 0
        let endIndex = positions.length - 1

        let low = 0
        let height = positions.length - 1
        while(low <= height) {
            const mid = Math.floor((low + height) / 2)
            const position = positions[mid]
            if(position.bottom < scrollTop) {
                low = mid + 1
            } else {
                height = mid - 1
            }
        }
        startIndex = low

        height = positions.length - 1
        while(low <= height) {
            const mid = Math.floor((low + height) / 2)
            const position = positions[mid]
            if(position.top > scrollBottom) {
                height = mid - 1
            } else {
                low = mid + 1
            }
        }
        endIndex = height

        setVisibleRange({
            start: Math.max(startIndex - overScan, 0),
            end: Math.min(endIndex + overScan, positions.length - 1)
        })
    }, [containerRef, positions, overScan])

    // 测量实际高度
    const handleItemMeasure = useCallback((index: number, height: number) => {
        if(isEqualHeight) return
        const newMap = new Map(heightMap)
        if(newMap.get(index) !== height) {
            newMap.set(index, height)
        }
        setHeightMap(newMap)
    }, [isEqualHeight, heightMap])

    // 监听容器尺寸变化
    useEffect(() => {
        const container = containerRef.current
        if(!container) return

        const handleScroll = () => {
            calculateVisibleRange()
        }
        container.addEventListener('scroll', handleScroll, {
            passive: true
        })

        const observer = new ResizeObserver(() => {
            calculateVisibleRange()
        })
        observer.observe(container)

        calculateVisibleRange()

        return () => {
            container.removeEventListener('scroll', handleScroll)
            observer.disconnect()
        }
    }, [calculateVisibleRange, containerRef])

    // 提取可见元素
    const visibleItems = useMemo(() => {
        const itemsToRender = []
        const { start, end } = visibleRange

        for(let i = start; i <= end; i++) {
            const position = positions[i]
            if(!position) continue
            const item = items[i]
            itemsToRender.push(
                <div
                    key={i}
                    style={{
                        position: "absolute",
                        width: "100%",
                        top: `${position.top}px`,
                        height: isEqualHeight ? `${estimatedHeight}px` : 'auto'
                    }}
                >
                    <div
                        style={{
                            width: '100%'
                        }}
                        ref={(el) => {
                            if(el && !isEqualHeight) {
                                const h = el.getBoundingClientRect().height
                                if(h > 0) handleItemMeasure(i, h)
                            }
                        }}
                    >
                        {item}
                    </div>
                </div>
            )
        }
        return itemsToRender
    }, [visibleRange, estimatedHeight, handleItemMeasure, isEqualHeight, items, positions])

    // 计算 padding
    const { paddingTop, paddingBottom } = useMemo(() => {
        if(positions.length <= 0) return { paddingBottom: 0, paddingTop: 0 }

        const startPosition = positions[visibleRange.start]
        const endPosition = positions[visibleRange.end]
        const totalHeight = positions[positions.length - 1].bottom

        return {
            paddingTop: startPosition?.top || 0,
            paddingBottom: totalHeight - (endPosition?.bottom || 0)
        }
    }, [positions, visibleRange])

    return (
        <div
            style={{
                position: "relative",
                height: `${containerHeight}px`,
                width: '100%',
                paddingBottom: `${paddingBottom}px`,
                paddingTop: `${paddingTop}px`
            }}
        >
            {visibleItems}
        </div>
    )
}

export default VirtualList