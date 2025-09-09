import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api' })

function App() {
  const [latest, setLatest] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string>('esp32-dev-1')
  const [postStatus, setPostStatus] = useState<string>('')

  const fetchLatest = async () => {
    const res = await api.get('/telemetry/latest', { params: { device_id: deviceId } })
    setLatest(res.data)
  }

  const fetchSummary = async () => {
    const res = await api.get('/telemetry/summary', { params: { device_id: deviceId } })
    setSummary(res.data)
  }

  const postSample = async () => {
    setPostStatus('posting...')
    try {
      await api.post('/telemetry/', {
        device_id: deviceId,
        temperature_c: 24.2,
        humidity_percent: 52.4,
        pressure_hpa: 1007.8,
        voltage_v: 3.7,
        rssi_dbm: -58,
        payload: { note: 'local test sample' }
      })
      setPostStatus('ok')
      await Promise.all([fetchLatest(), fetchSummary()])
    } catch (e: any) {
      setPostStatus('error')
    }
  }

  useEffect(() => {
    fetchLatest()
    fetchSummary()
    const t = setInterval(() => {
      fetchSummary()
    }, 5000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <h1>ESP32 Telemetry Local Test</h1>
      <div className="card">
        <label>
          Device ID
          <input value={deviceId} onChange={e => setDeviceId(e.target.value)} />
        </label>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button onClick={fetchLatest}>Fetch Latest</button>
          <button onClick={postSample}>Post Sample</button>
          <button onClick={fetchSummary}>Refresh Summary</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong>POST:</strong> {postStatus}
        </div>
        <h3 style={{ marginTop: 16 }}>Latest Record</h3>
        <pre style={{ background: '#111', color: '#0f0', padding: 12 }}>
{JSON.stringify(latest, null, 2)}
        </pre>
        <h3>ESP32 Summary</h3>
        <pre style={{ background: '#111', color: '#0ff', padding: 12 }}>
{JSON.stringify(summary, null, 2)}
        </pre>
      </div>
    </>
  )
}

export default App
