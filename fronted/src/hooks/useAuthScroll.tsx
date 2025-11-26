import { useEffect, useLayoutEffect, useRef } from "react";

const useAuthScroll = (
    containerRef: React.RefObject<HTMLElement | null>,
    msgList: any[],
    isPending: boolean,
    threshold = 30,
    debounceMs = 150
) => {

    const isLocked = useRef(true)
    const debounceTimer = useRef<null|number>(null)

    // 锁定底部(相比于useEffect可以减少闪烁)
    useLayoutEffect(() => {
        const container = containerRef.current
        if(!container || !isLocked.current) return
        container.scrollTop = container.scrollHeight - container.clientHeight
    }, [msgList, containerRef])
    // 解除锁定
    useEffect(() => {
        const container = containerRef.current
        if(!container) return

        const checkAtBottom = () => {
            return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold
        }

        const handleScroll = () => {
            const isAtBottom = checkAtBottom()
            if(!isAtBottom) {
                isLocked.current = false
                if(debounceTimer.current) {
                    window.clearTimeout(debounceTimer.current)
                    debounceTimer.current = null
                }
                return
            }
            debounceTimer.current = setTimeout(() => {
                const newAtBottom = checkAtBottom()
                if(newAtBottom) {
                    isLocked.current = true
                }
                window.clearTimeout(debounceTimer.current || undefined)
                debounceTimer.current = null
            }, debounceMs)
        }

        container.addEventListener('scroll', handleScroll)

        return () => {
            if(debounceTimer.current) {
                window.clearTimeout(debounceTimer.current)
                debounceTimer.current = null
            }
            container.removeEventListener('scroll', handleScroll)
        }
    }, [containerRef, debounceMs, threshold])

    useEffect(() => {
        if(!isPending) {
            isLocked.current = true
        }
    }, [isPending])
}

export default useAuthScroll