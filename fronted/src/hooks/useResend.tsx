import { useState, useRef, useEffect, useCallback } from "react"

interface UseRetrySendProps<T> {
    callback: (...arg: any[]) => Promise<T>
    maxRetries?: number
    retryDelay?: number
    coolDownDelay?: number
    onRetry?: (attemp?: number) => void
    onCoolDown?: () => void
}

const useRetrySend = <T,>({
    callback,
    maxRetries = 3,
    retryDelay = 1000,
    coolDownDelay = 5000,
    onRetry,
    onCoolDown
}: UseRetrySendProps<T>) => {
    // 请求次数
    const [attempt, setAttempt] = useState(0)
    // 是否处于冷却
    const [isCoolingDown, setCoolingDown] = useState(false)
    // 是否在等待响应
    const [isLoading, setLoading] = useState(false)
    // retry timer
    const retryTimer = useRef<number | null> (null)
    // 冷却timer
    const coolDownTimer = useRef<number | null>(null)
    // 是否挂载ref
    const isMountedRef = useRef(false)
    // 当前活动尝试次数
    const attemptRef = useRef(0)
    // 挂载设置ref
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            clearTimeouts()
        }
    }, [])
    // 清除定时函数
    const clearTimeouts = () => {
        if(retryTimer.current) {
            clearTimeout(retryTimer.current)
        }
        if(coolDownTimer.current) {
            clearTimeout(coolDownTimer.current)
        }
    }
    // 开始冷却
    const startCoolDown = useCallback(() => {
        setCoolingDown(true)
        onCoolDown?.()
        coolDownTimer.current = setTimeout(() => {
            if(!isMountedRef.current) return
            setCoolingDown(false)
            setAttempt(0)
            clearTimeout(coolDownTimer.current!)
            coolDownTimer.current = null
        }, coolDownDelay)
    }, [coolDownDelay, onCoolDown])
    // 重置函数
    const reset = useCallback(() => {
        setAttempt(0)
        setCoolingDown(false)
        clearTimeouts()
    }, [])
    // 取消重试
    const cancelRetry = useCallback(() => {
        clearTimeouts()
        setLoading(false)
    }, [])

    const excute = useCallback((...args: any[]) => {
        if(isLoading || isCoolingDown || attempt < maxRetries) return
        setAttempt(prev => prev + 1)
        attemptRef.current = 0
        
        const attemptRequest = async (attemptTimes: number) => {
            attemptRef.current++
            setLoading(true)
            try {
                const resp = await callback(...args)
                setAttempt(0)
                return resp
            } catch(err) {
                if(attemptTimes >= maxRetries) {
                    startCoolDown()
                    throw err
                }

                return new Promise((resolve, reject) => {
                    if(retryTimer.current) {
                        clearTimeout(retryTimer.current)
                    }
                    onRetry?.()
                    retryTimer.current = setTimeout(async () => {
                        try {
                            const resp = await attemptRequest(attemptRef.current)
                            resolve(resp)
                        } catch (err) {
                            reject(err)
                        }
                    }, retryDelay)
                })
            }finally{
                setLoading(false)
            }
        }
        return attemptRequest(attemptRef.current)
    }, [callback, isCoolingDown, isLoading, maxRetries, onRetry, retryDelay, startCoolDown, attempt])

    return {excute, isCoolingDown, reset, cancelRetry}
}

export default useRetrySend