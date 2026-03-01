import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { useStore } from '../stores/app'

export function CodeEditor() {
  const { code, setCode, isAdvancedMode } = useStore()

  if (!isAdvancedMode) return null

  return (
    <div className="flex-1 flex flex-col border-r border-[#333]">
      <div className="bg-[#111] border-b border-[#333] px-3 py-1.5 flex items-center gap-2">
        <span className="text-[#f59e0b]">◉</span>
        <span className="text-[11px] text-[#666]">editor</span>
        <span className="text-[#333]">│</span>
        <span className="text-[10px] text-[#444]">pattern.js</span>
      </div>
      <div className="flex-1 overflow-auto bg-[#0a0a0a]">
        <CodeMirror
          value={code}
          height="100%"
          extensions={[javascript()]}
          onChange={(value) => setCode(value)}
          theme="dark"
          className="h-full text-sm"
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
          }}
        />
      </div>
    </div>
  )
}
