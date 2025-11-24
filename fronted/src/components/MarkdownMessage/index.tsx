import Markdown from 'react-markdown'
import styles from './MarkdownMessage.module.scss'
import CodeBlock from '../CodeBlock'
import { useEffect, useRef, useState } from 'react'
import useHandleMessage from '../../hooks/useHandleMessage'

type Props = {
    content: string,
    newContent: string
}

export type Md = {
    content: string,
    type: "code" | "text",
    language?: string | undefined
}

const MarkdownMessage = ({content, newContent}: Props) => {
    // const codeSignNum = useRef(0)
    // const prevContent = useRef("")
    // const [mdList, setMdList] = useState<Md[]>([{content: "", type: "text"}])
    // //继续写分离代码
    // useEffect(() => {
    //     if(!content) return
    //     // 当前字符为 ``` 时
    //     if(newContent === '```') {
    //         // 第一次碰到
    //         if(codeSignNum.current / 3 === 0) {
    //             setMdList(prev => [...prev, {
    //                 type: 'code',
    //                 content: ""
    //             }])
    //         // 第二次碰到
    //         }else if(codeSignNum.current / 3 === 2) {
    //             setMdList(prev => [...prev, {
    //                 type: 'text',
    //                 content: ""
    //             }])
    //         }
    //         codeSignNum.current++
    //     }

    //     // 已经碰到过首部 ``` 需要识别语言类型
    //     if(codeSignNum.current / 3 == 1) {
    //         setMdList(prev => [...prev.slice(0, prev.length - 1), {...prev[prev.length-1], language: newContent}])
    //         console.log(newContent)
    //         codeSignNum.current++
    //     } else{
    //         setMdList(prev => [...prev.slice(0, prev.length - 1), {...prev[prev.length-1], content: prev[prev.length-1].content + newContent}])
    //         if(codeSignNum.current / 3 !== 0) codeSignNum.current++
    //     }
    //     prevContent.current = content
    // }, [content, newContent])
    // useEffect(() => {
    //     console.log(newContent)
    // }, [newContent])
    const mdList = useHandleMessage(content)
    return (
        <div className={styles.markdownContainer}>
            {
                mdList.map((item, index) => {
                    if(item.type === 'text') {
                        return <Markdown key={index} >{item.content}</Markdown>
                    }
                    return <CodeBlock key={index} className={'language-' + item.language}>{[item.content]}</CodeBlock>
                })
            }
        </div>
    )
}

export default MarkdownMessage