import Markdown from 'react-markdown'
import styles from './MarkdownMessage.module.scss'
import CodeBlock from '../CodeBlock'
import React from 'react'

type Props = {
    content: string
}

export type Md = {
    content: string,
    type: "code" | "text",
    language?: string | undefined
}

const MarkdownMessage = ({content}: Props) => {
    return (
        <div className={styles.markdownContainer}>
            <Markdown
                components={{
                    code: ({className, children, ...props }) => {
                        return (
                        <CodeBlock className={className} {...props}>
                            {[children]}
                        </CodeBlock>
                    )},
                }}
            >{content}</Markdown>
        </div>
    )
}

export default React.memo(MarkdownMessage)