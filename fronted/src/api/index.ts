import { type Msg } from '../store/slices/Message'
const BASE_URL = 'http://localhost:3001'

interface SubmitData  {
    message: Msg[],
    name: string,
    time: string,
    id: string
}

const submitData = async (data: SubmitData) => {
    const resp = await fetch(`${BASE_URL}/api/history`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    
    if (!resp.ok) {
        throw new Error(`提交失败: ${resp.statusText}`)
    }
    
    return resp
}

export { submitData }