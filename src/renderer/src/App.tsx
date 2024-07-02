import { TerminalComponent } from '@renderer/components/TerminalComponent'
// import { SocketIOTestComponent } from '@renderer/components/SocketTest'

function App(): JSX.Element {
  return (
    <div className="w-screen h-screen bg-black">
      <TerminalComponent />
    </div>
  )
}

export default App
