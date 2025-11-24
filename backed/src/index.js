const { OpenAI } = require("openai")
require("dotenv").config()
const express = require("express")
const cors = require("cors")

const app = express()
const port = 3001

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-649935490cde4692b3a5694226dcd6cf',
    baseURL: process.env.OPENAI_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1"
})

const sseClients = new Map()

app.use(cors()) //允许所有跨域请求
app.use(express.json()) //解析json请求体

app.post('/api/chat', async (req, res) => {
    try {
        const { conversationId, messages } = req.body || {}

        if (!conversationId) {
            return res.status(400).json({ error: 'conversationId 是必填参数' })
        }

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages 必须是非空数组' })
        }

        const client = sseClients.get(conversationId)
        if (!client) {
            return res.status(404).json({ error: '对应的 SSE 连接不存在，请先建立连接' })
        }

        startChatStream(conversationId, messages).catch((error) => {
            console.error('Streaming error:', error)
        })

        res.json({ status: 'accepted' })
    } catch (error) {
        console.error('POST /api/chat error:', error)
        res.status(500).json({ error: '服务器处理失败' })
    }
})

// SSE
app.options('/sse', cors())
app.get('/sse', (req, res) => {
    const { conversationId } = req.query

    if (!conversationId) {
        res.status(400).setHeader('Content-Type', 'text/plain')
        return res.end('conversationId 是必填参数')
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.flushHeaders?.()

    const sendEvent = (event, data) => {
        res.write(`event: ${event}\n`)
        res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`)
    }

    const existingClient = sseClients.get(conversationId)
    if (existingClient) {
        existingClient.controller?.abort()
        existingClient.res.end()
    }

    const client = {
        res,
        sendEvent,
        controller: null
    }

    sseClients.set(conversationId, client)
    sendEvent('connected', { message: 'Connection established' })

    const cleanUp = () => {
        client.controller?.abort()
        if (sseClients.get(conversationId) === client) {
            sseClients.delete(conversationId)
        }
        res.end()
    }

    req.on('close', cleanUp)
    req.on('error', cleanUp)
})

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});


async function streamChat(messages, onDelta, signal) {
    const completion = await openai.chat.completions.create({
        model: "qwen3-vl-plus",
        messages,
        stream: true,
        stream_options: {
            include_usage: true
        },
        signal
    })

    for await (const chunk of completion) {
        const delta = chunk.choices?.[0]?.delta
        if (delta) {
            onDelta({ content: delta?.content })
        }
        console.log(delta)
    }
}

async function startChatStream(conversationId, messages) {
    const client = sseClients.get(conversationId)
    if (!client) {
        throw new Error('SSE client is not connected')
    }

    client.controller?.abort()
    const controller = new AbortController()
    client.controller = controller

    try {
        await streamChat(messages, (delta) => {
            client.sendEvent('message', delta)
        }, controller.signal)

        client.sendEvent('done', { status: 'completed' })
    } catch (error) {
        if (error.name !== 'AbortError') {
            client.sendEvent('error', { message: error.message || 'Unknown streaming error' })
        }
        throw error
    } finally {
        if (sseClients.get(conversationId) === client) {
            client.controller = null
        }
    }
}
