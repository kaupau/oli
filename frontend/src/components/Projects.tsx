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
        className="flex items-center gap-2 px-2 py-1 text-[11px] border border-[#333] hover:border-[#444] transition-colors"
      >
        <span className="text-[#555]">project:</span>
        <span className="text-[#888] max-w-[100px] truncate">
          {currentProject?.name || 'untitled'}
        </span>
        <span className="text-[#444]">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-[#111] border border-[#333] z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-[#333] bg-[#0c0c0c]">
            <div className="text-[10px] text-[#555] mb-2">$ new project</div>
            <div className="flex gap-1">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="project-name"
                className="flex-1 bg-[#0a0a0a] border border-[#333] px-2 py-1 text-[11px] outline-none focus:border-[#555] text-[#888]"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
              <button
                onClick={handleCreateProject}
                className="term-btn term-btn-primary text-[10px]"
              >
                +
              </button>
            </div>
          </div>

          {/* Project list */}
          <div className="max-h-48 overflow-auto">
            {projects.length === 0 ? (
              <div className="p-3 text-center text-[#555] text-[11px]">
                no projects found
              </div>
            ) : (
              <div className="py-1">
                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    onClick={() => handleLoadProject(project.id)}
                    className={`px-3 py-1.5 flex items-center justify-between cursor-pointer text-[11px] group transition-colors ${
                      currentProject?.id === project.id
                        ? 'bg-[#1a1a1a] text-[#ccc]'
                        : 'text-[#666] hover:bg-[#161616] hover:text-[#999]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#333]">{index === projects.length - 1 ? '└' : '├'}</span>
                      <span className="truncate">{project.name}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className="text-[#444] hover:text-[#f87171] opacity-0 group-hover:opacity-100 text-[10px] ml-2"
                    >
                      ×
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
