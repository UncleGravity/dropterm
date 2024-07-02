import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const TerminalComponent = (): JSX.Element => {
  const terminalRef = useRef(null)
  const fitAddon = new FitAddon()
  const terminal = useRef<Terminal | null>(null)

  useEffect(() => {
    // Add this style block at the beginning of the useEffect
    const style = document.createElement('style')
    style.textContent = `
      .xterm {
        padding: 10px;
        height: 100%;
        width: 100%;
      }
      .xterm-screen {
        width: inherit!important;
        height: inherit!important;
      }
    `
    document.head.appendChild(style)

    terminal.current = new Terminal({
      cursorBlink: true,
      disableStdin: false,
      allowTransparency: true,
      fontFamily: '"MesloLGS NF", monospace',
      fontSize: 13
    })
    terminal.current.loadAddon(fitAddon)
    if (terminalRef.current) {
      terminal.current.open(terminalRef.current)
      terminal.current.focus() // Add this line to focus the terminal
    }

    const handleResize = (): void => {
      fitAddon.fit()
      if (terminal.current) {
        const { cols, rows } = terminal.current
        window.electron.ipcRenderer.send('terminal-resize', { cols, rows })
      }
    }

    const handleTerminalData = (_, data): void => {
      console.log('terminal-data', data)
      if (terminal.current) {
        terminal.current.write(data)
      }
    }

    window.electron.ipcRenderer.on('terminal-data', handleTerminalData)

    terminal.current.onData((data): void => {
      console.log('terminal-onData', data)
      window.electron.ipcRenderer.send('terminal-input', data)
    })

    window.addEventListener('resize', handleResize)
    handleResize()

    return (): void => { // Specify return type as void
      if (terminal.current) {
        terminal.current.dispose()
      }
      window.removeEventListener('resize', handleResize)
      window.electron.ipcRenderer.removeAllListeners('terminal-data')
      document.head.removeChild(style)
    }
  }, [])

  return <div ref={terminalRef} style={{ height: '100%', width: '100%' }}></div>
}

export { TerminalComponent }
