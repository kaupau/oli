import { useState, useEffect } from 'react'
import { useStore } from '../stores/app'
import { fetchProjects, createProject, getProject, deleteProject } from '../lib/api'

export function Projects() {
  const { projects, setProjects, currentProject, setCurrentProject, setCode } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-projects]')) setIsOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [isOpen])

  const loadProjects = async () => {
    const data = await fetchProjects()
    setProjects(data)
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    const project = await createProject(newProjectName)
    await loadProjects()
    setCurrentProject(project)
    setNewProjectName('')
  }

  const handleLoadProject = async (id: number) => {
    const project = await getProject(id)
    setCurrentProject(project)
    setIsOpen(false)
  }

  const handleDeleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteProject(id)
    if (currentProject?.id === id) {
      setCurrentProject(null)
      setCode('// Welcome to oli\nsound("test_kick test_hihat test_kick test_hihat")\n')
    }
    await loadProjects()
  }

  return (
    <div className="relative" data-projects>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}
        className="flex items-center text-[11px] text-[#555] hover:text-[#888] transition-colors"
      >
        <span className="text-[#333]">(</span>
        <span className="text-[#7dd3fc] max-w-[80px] sm:max-w-[120px] truncate">
          {currentProject?.name || 'scratch'}
        </span>
        <span className="text-[#333]">)</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[#0a0a0a] border border-[#333] z-50 overflow-hidden text-[11px]">
          {/* Header */}
          <div className="px-2 py-2 border-b border-[#333]">
            <div className="flex items-center gap-1 text-[#555]">
              <span>$</span>
              <span className="text-[#4ade80]">touch</span>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="name.oli"
                className="flex-1 bg-transparent outline-none text-[#888] placeholder:text-[#444]"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
              <button
                onClick={handleCreateProject}
                className="text-[#555] hover:text-[#4ade80]"
              >
                ⏎
              </button>
            </div>
          </div>

          {/* Project list */}
          <div className="max-h-48 overflow-auto">
            <div className="px-2 py-1 text-[#555] border-b border-[#222]">
              $ ls -la ~/projects/
            </div>
            {projects.length === 0 ? (
              <div className="px-2 py-2 text-[#444]">
                (empty)
              </div>
            ) : (
              <div className="py-1">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleLoadProject(project.id)}
                    className={`px-2 py-1 flex items-center justify-between cursor-pointer group transition-colors ${
                      currentProject?.id === project.id
                        ? 'text-[#4ade80] bg-[#111]'
                        : 'text-[#666] hover:bg-[#111] hover:text-[#888]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#555]">-rw-r--</span>
                      <span className="truncate">{project.name}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="text-[#444] hover:text-[#f87171] opacity-0 group-hover:opacity-100"
                      title="rm"
                    >
                      rm
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
