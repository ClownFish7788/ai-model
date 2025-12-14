import { type Msg } from '../store/slices/Message'
const BASE_URL = 'http://localhost:3001'

interface SumbitData  {
    message: Msg[],
    name: string,
    time: string,
    id: string
}

const submitData = async (data: SumbitData) => {
    const resp = await fetch(`${BASE_URL}/api/history`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    return resp
}

export { submitData }