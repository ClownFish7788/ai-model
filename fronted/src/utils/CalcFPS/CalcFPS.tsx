import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Button from "../../components/Button"


export const CalcFPS = () => {
    const [isCalcing, setIsCalcing] = useState(false)
    const lastTime = useRef(performance.now())
    const frameCount = useRef(0)
    const rAFId = useRef<null | number>(null)
    const calc = useCallback(() => {
        frameCount.current++
        rAFId.current = requestAnimationFrame(calc)
    }, [])
    useEffect(() => {
        if(isCalcing) {
            lastTime.current = performance.now()
            frameCount.current = 0
            rAFId.current = requestAnimationFrame(calc)
        } else {
            const fps = Math.floor(1000 * frameCount.current / (performance.now() - lastTime.current))
            console.log(fps)
        }
        return () => {
            if(rAFId.current) {
                cancelAnimationFrame(rAFId.current)
                rAFId.current = null
            }
        }
    }, [isCalcing, calc])

    return createPortal(<Button 
        content={isCalcing ? '计算中' : '开始计算'}
        selected={isCalcing}
        callback={() => setIsCalcing(pre => !pre)} 
    />, document.body)
}