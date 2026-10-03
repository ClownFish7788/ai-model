import Alside from "./components/Alside"
import Content from "./components/Content"
import './App.scss'
import { CalcFPS } from "./utils/CalcFPS/CalcFPS"

function App() {
  return (
    <div className="Home">
      <Alside />
      <Content />
      <CalcFPS />
    </div>
  )
}

export default App
