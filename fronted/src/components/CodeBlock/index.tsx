import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

// 用于判断哪一行是否需要高亮
const parseMeta = (meta:string | undefined | null) => {
    if(!meta) return (lineNum: number) => false
    const exp = /\{([^}]+)\}/
    const match = exp.exec(meta)
    if(!match) return (lineNum: number) => false
    const parts = match[1].split(',').map(p => p.trim())
    const lineNumSet = new Set<number>()
    for(const p of parts) {
        if(p.includes('-')) {
            const [a, b] = p.split('-').map(num => +num)
            for(let i = a;i < b;i++) {
                lineNumSet.add(i)
            }
        }else {
            lineNumSet.add(Number(p))
        }
    }
    return (lineNum: number) => lineNumSet.has(lineNum)
}


const CodeBlock: React.FC<{
    node?: any;
    inline?: boolean;
    className?: string;
    children: React.ReactNode[];
    meta?: string
}> = ({inline, className, children, meta}) => {
    const code = String(children?.[0] ?? "")
    if(inline) return <code className='inline-code'>{ code }</code>
    
    const match = /language-(\w+)/.exec(className || "")
    const lang = match ? match[1] : "text"
    const highlightLine = parseMeta(meta)

    return <SyntaxHighlighter
        language={lang}
        showLineNumbers={false}
        startingLineNumber={1} 
        lineProps={(lineNumber: number) => {
            if (highlightLine(lineNumber)) {
                console.log(lineNumber)
            return { style: { display: "block", background: "rgba(255,235,59,0.08)" } };
            }
            return { style: { display: "block" } };
        }}
    >
        { code }
    </SyntaxHighlighter>
}

export default CodeBlock