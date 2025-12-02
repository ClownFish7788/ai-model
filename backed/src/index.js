const { OpenAI } = require("openai")
require("dotenv").config()
const express = require("express")
const cors = require("cors")
const fs = require("fs").promises
const path = require("path")

const app = express()
const port = 3001

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-649935490cde4692b3a5694226dcd6cf',
    baseURL: process.env.OPENAI_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1"
})

const sseClients = new Map()

// 历史记录存储文件路径
const HISTORY_FILE_PATH = path.join(__dirname, '..', 'data', 'history.json')

// 确保数据目录存在
async function ensureDataDirectory() {
    const dataDir = path.dirname(HISTORY_FILE_PATH)
    try {
        await fs.access(dataDir)
    } catch {
        await fs.mkdir(dataDir, { recursive: true })
    }
}

// 读取历史记录
async function readHistory() {
    try {
        await ensureDataDirectory()
        const data = await fs.readFile(HISTORY_FILE_PATH, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 文件不存在，返回空数组
            return { historyList: [] }
        }
        throw error
    }
}

// 保存历史记录
async function saveHistory(historyList) {
    await ensureDataDirectory()
    await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify({ historyList }, null, 2), 'utf-8')
}

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

// ==================== 历史记录 API ====================

// 获取所有历史记录
app.get('/api/history', async (req, res) => {
    try {
        const data = await readHistory()
        res.json(data)
    } catch (error) {
        console.error('GET /api/history error:', error)
        res.status(500).json({ error: '获取历史记录失败' })
    }
})

// 根据 ID 获取单个历史记录
app.get('/api/history/:id', async (req, res) => {
    try {
        const { id } = req.params
        const data = await readHistory()
        const history = data.historyList.find(item => item.id === id)
        
        if (!history) {
            return res.status(404).json({ error: '历史记录不存在' })
        }
        
        res.json(history)
    } catch (error) {
        console.error('GET /api/history/:id error:', error)
        res.status(500).json({ error: '获取历史记录失败' })
    }
})

// 保存新的历史记录
app.post('/api/history', async (req, res) => {
    try {
        const { message, time, id, name } = req.body
        
        // 验证必填字段
        if (!id) {
            return res.status(400).json({ error: 'id 是必填参数' })
        }
        if (!name) {
            return res.status(400).json({ error: 'name 是必填参数' })
        }
        if (!Array.isArray(message)) {
            return res.status(400).json({ error: 'message 必须是数组' })
        }
        
        const data = await readHistory()
        
        // 检查是否已存在相同 ID 的记录
        const existingIndex = data.historyList.findIndex(item => item.id === id)
        
        const newHistory = {
            message,
            time: time || new Date().toISOString(),
            id,
            name
        }
        
        if (existingIndex !== -1) {
            // 如果已存在，更新记录
            data.historyList[existingIndex] = newHistory
            await saveHistory(data.historyList)
            res.json({ message: '历史记录已更新', history: newHistory })
        } else {
            // 新记录，添加到列表开头（最新的在前面）
            data.historyList.unshift(newHistory)
            await saveHistory(data.historyList)
            res.json({ message: '历史记录已保存', history: newHistory })
        }
    } catch (error) {
        console.error('POST /api/history error:', error)
        res.status(500).json({ error: '保存历史记录失败' })
    }
})

// 更新历史记录
app.put('/api/history/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { message, time, name } = req.body
        
        const data = await readHistory()
        const existingIndex = data.historyList.findIndex(item => item.id === id)
        
        if (existingIndex === -1) {
            return res.status(404).json({ error: '历史记录不存在' })
        }
        
        // 更新记录
        const updatedHistory = {
            ...data.historyList[existingIndex],
            ...(message !== undefined && { message }),
            ...(time !== undefined && { time }),
            ...(name !== undefined && { name })
        }
        
        data.historyList[existingIndex] = updatedHistory
        await saveHistory(data.historyList)
        
        res.json({ message: '历史记录已更新', history: updatedHistory })
    } catch (error) {
        console.error('PUT /api/history/:id error:', error)
        res.status(500).json({ error: '更新历史记录失败' })
    }
})

// 删除历史记录
app.delete('/api/history/:id', async (req, res) => {
    try {
        const { id } = req.params
        const data = await readHistory()
        
        const existingIndex = data.historyList.findIndex(item => item.id === id)
        
        if (existingIndex === -1) {
            return res.status(404).json({ error: '历史记录不存在' })
        }
        
        data.historyList.splice(existingIndex, 1)
        await saveHistory(data.historyList)
        
        res.json({ message: '历史记录已删除' })
    } catch (error) {
        console.error('DELETE /api/history/:id error:', error)
        res.status(500).json({ error: '删除历史记录失败' })
    }
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
