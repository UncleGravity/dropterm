import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { ClipboardAddon } from '@xterm/addon-clipboard'
import { ImageAddon } from '@xterm/addon-image'
import '@xterm/xterm/css/xterm.css'

const TerminalComponent = (): JSX.Element => {
  const terminalRef = useRef(null)
  const fitAddon = new FitAddon()
  const clipboardAddon = new ClipboardAddon()
  const terminal = useRef<Terminal | null>(null)

  const imageAddon = new ImageAddon({
    enableSizeReports: true,
    // pixelLimit: 16777216,
    sixelSupport: true,
    sixelScrolling: true,
    sixelPaletteLimit: 256,
    // sixelSizeLimit: 25000000,
    // storageLimit: 128,
    showPlaceholder: true,
    iipSupport: true
    // iipSizeLimit: 20000000
  })

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

    const gruvboxTheme = {
      foreground: '#ebdbb2',
      background: '#282828',
      cursor: '#bdae93',
      cursorAccent: '#665c54',
      selectionBackground: '#d65d0e',
      selectionForeground: '#ebdbb2',
      black: '#3c3836',
      red: '#cc241d', 
      green: '#98971a',
      yellow: '#d79921',
      blue: '#458588',
      magenta: '#b16286',
      cyan: '#689d6a',
      white: '#a89984',
      brightBlack: '#928374',
      brightRed: '#fb4934',
      brightGreen: '#b8bb26', 
      brightYellow: '#fabd2f',
      brightBlue: '#83a598',
      brightMagenta: '#d3869b',
      brightCyan: '#8ec07c',
      brightWhite: '#fbf1c7'
    };

    terminal.current = new Terminal({
      theme: gruvboxTheme,
      cursorBlink: true,
      disableStdin: false,
      allowTransparency: true,
      fontFamily: '"MesloLGS Nerd Font", monospace',
      fontSize: 13,
      macOptionIsMeta: true
    })
    terminal.current.loadAddon(fitAddon)
    terminal.current.loadAddon(clipboardAddon)
    terminal.current.loadAddon(imageAddon)
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
        // Check if the data contains an OSC 52 sequence
        if (data.startsWith('\u001B]52;')) {
          // Attempt to extract the base64 encoded string
          const base64Data = data.match(/\u001B\]52;.*?;([^\u0007]*)\u0007/)?.[1]
          if (base64Data) {
            try {
              const decodedData = atob(base64Data)
              console.log('Decoded OSC 52 Data:', decodedData)

              // Write the decoded data to the clipboard
              navigator.clipboard
                .writeText(decodedData)
                .then(() => {
                  console.log('Clipboard updated with OSC 52 data.')
                })
                .catch((err) => {
                  console.error('Failed to write to clipboard:', err)
                })
            } catch (err) {
              console.error('Error decoding base64 data:', err)
            }
          } else {
            console.error('No base64 data found in OSC 52 sequence.')
          }
        } else {
          // Normal data processing
          terminal.current.write(data)
        }
      }
    }

    window.electron.ipcRenderer.on('terminal-data', handleTerminalData)

    terminal.current.onData((data): void => {
      console.log('terminal-onData', data)
      window.electron.ipcRenderer.send('terminal-input', data)
    })

    window.addEventListener('resize', handleResize)
    handleResize()

    return (): void => {
      // Specify return type as void
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
