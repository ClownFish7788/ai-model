import { useDebugValue, useEffect, useRef, useState } from "react"
import { type Md } from "../components/MarkdownMessage"

const CODE_BLOCK_DELIMITER = '```'

const useHandleMessage = (content: string) => {
    const [mdList, setMdList] = useState<Md[]>([
        {
            content: "",
            type: "text"
        }
    ])
    

    const parsingState = useRef({
        lastProcessedIndex: 0,
        inCodeBlock: false,
        currentLanguage: "",
        pendingContent: ""
    })

    useEffect(() => {
        if(content.trim() === "" || parsingState.current.lastProcessedIndex === content.length) return 
        const pState = parsingState.current
        // 更新 parsingState 状态
        pState.pendingContent += content.slice(pState.lastProcessedIndex)
        pState.lastProcessedIndex = content.length
        let processedIndex = 0
        const maxIterations = 1000 // 防止无限循环
        let iterations = 0
        
        while(processedIndex < pState.pendingContent.length && iterations < maxIterations) {
            iterations++
            const remainingContent = pState.pendingContent.slice(processedIndex)
            const delimiterIndex = remainingContent.indexOf(CODE_BLOCK_DELIMITER)
            
            // 接下来没有 ```
            if(delimiterIndex === -1) {
                if(remainingContent.length > 0) {
                    setMdList(prev => {
                        if (prev.length === 0) {
                            return [{ content: remainingContent, type: pState.inCodeBlock ? "code" : "text" }]
                        }
                        const lastIndex = prev.length - 1
                        return [
                            ...prev.slice(0, lastIndex),
                            {
                                ...prev[lastIndex],
                                content: prev[lastIndex].content + remainingContent
                            }
                        ]
                    })
                }
                processedIndex = pState.pendingContent.length // 处理完所有内容
                break
            }

            // 处理 ``` 前的字符
            const beforeContent = remainingContent.slice(0, delimiterIndex)
            if(beforeContent.length > 0) {
                setMdList(prev => {
                    if (prev.length === 0) {
                        return [{ content: beforeContent, type: pState.inCodeBlock ? "code" : "text" }]
                    }
                    return [
                        ...prev.slice(0, prev.length-1),
                        {
                            ...prev[prev.length-1],
                            content: prev[prev.length-1].content + beforeContent
                        }
                    ]
                })
            }
            
            // 在代码块内，遇到第二个 ```，退出代码块
            if(pState.inCodeBlock) {
                pState.inCodeBlock = false
                pState.currentLanguage = ""
                
                // 创建新的文本块
                setMdList(prev => [...prev, {
                    content: "",
                    type: "text"
                }])
            } else {
                // 不在代码块内，进入代码块
                pState.inCodeBlock = true
                const afterDelimiter = remainingContent.slice(delimiterIndex + CODE_BLOCK_DELIMITER.length)
                const newLineIndex = afterDelimiter.indexOf('\n')
                let contentStart = 0
                let language = ""
                let shouldWaitForMore = false
                
                if(newLineIndex !== -1) {
                    // 有换行，提取语言标识
                    language = afterDelimiter.slice(0, newLineIndex).trim()
                    contentStart = newLineIndex + 1
                } else {
                    // 没有换行
                    const trimmed = afterDelimiter.trim()
                    if(trimmed.length > 0 && !trimmed.includes(CODE_BLOCK_DELIMITER)) {
                        // 可能是语言标识的一部分，但还没传完，等待更多内容
                        // 不处理 afterDelimiter，保留在 pendingContent 中
                        shouldWaitForMore = true
                        language = ""
                        contentStart = 0
                    } else {
                        // 没有语言标识，直接开始代码内容
                        contentStart = afterDelimiter.length
                    }
                }

                setMdList(prev => [...prev, {
                    content: "",
                    type: "code",
                    language: language || undefined
                }])
                pState.currentLanguage = language
                
                // 如果有代码内容，添加到代码块
                if(!shouldWaitForMore && contentStart > 0 && contentStart < afterDelimiter.length) {
                    const codeContent = afterDelimiter.slice(contentStart)
                    setMdList(prev => {
                        if (prev.length > 0) {
                            const lastIndex = prev.length - 1
                            return [
                                ...prev.slice(0, lastIndex),
                                {
                                    ...prev[lastIndex],
                                    content: prev[lastIndex].content + codeContent
                                }
                            ]
                        }
                        return prev
                    })
                }
                
                // 正确计算：processedIndex 是绝对位置
                if (shouldWaitForMore) {
                    // 如果等待更多内容，只跳过 ``` 和之前的内容，保留 afterDelimiter
                    processedIndex += delimiterIndex + CODE_BLOCK_DELIMITER.length
                } else {
                    // 正常情况，处理完所有内容
                    processedIndex += delimiterIndex + CODE_BLOCK_DELIMITER.length + contentStart
                }
            }
        }
        
        // 防止无限循环警告
        if (iterations >= maxIterations) {
            console.warn('useHandleMessage: 达到最大迭代次数，可能存在无限循环')
        }       
        // 移除已处理的内容
        pState.pendingContent = pState.pendingContent.slice(processedIndex)
    }, [content])

    useEffect(() => {
        if (!content) {
            setMdList([{ content: "", type: "text" }])
            parsingState.current = {
                lastProcessedIndex: 0,
                inCodeBlock: false,
                currentLanguage: "",
                pendingContent: ""
            }
        }
    }, [content])

    useDebugValue(mdList) // 暴露mdList到控制面板

    return mdList
}

export default useHandleMessage
