import { useState, useEffect, useRef, useCallback } from 'react'
import { useStore, type Project } from '../stores/app'
import { fetchProjects, createProject, getProject, deleteProject, updateProject, duplicateProject } from '../lib/api'

export function Projects() {
  const { projects, setProjects, currentProject, setCurrentProject, setCode, code } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedCodeRef = useRef<string>('')

  useEffect(() => {
    loadProjects()
  }, [])

  // Track when code changes from the saved version
  useEffect(() => {
    if (currentProject && code !== lastSavedCodeRef.current) {
      setHasUnsavedChanges(true)
    }
  }, [code, currentProject])

  // Auto-save with debounce
  const saveProject = useCallback(async () => {
    if (!currentProject || code === lastSavedCodeRef.current) return

    setSaving(true)
    try {
      await updateProject(currentProject.id, currentProject.name, code)
      lastSavedCodeRef.current = code
      setHasUnsavedChanges(false)
    } catch {
      // Silent fail - user can retry
    } finally {
      setSaving(false)
    }
  }, [currentProject, code])

  useEffect(() => {
    if (!currentProject || !hasUnsavedChanges) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveProject()
    }, 1500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [code, currentProject, hasUnsavedChanges, saveProject])

  useEffect(() => {
    if (!isOpen) return
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-projects]')) {
        setIsOpen(false)
        setMenuOpenId(null)
        setEditingId(null)
      }
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
    const project = await createProject(newProjectName, code)
    await loadProjects()
    setCurrentProject(project)
    lastSavedCodeRef.current = code
    setHasUnsavedChanges(false)
    setNewProjectName('')
  }

  const handleLoadProject = async (id: number) => {
    if (editingId === id) return
    const project = await getProject(id)
    setCurrentProject(project)
    lastSavedCodeRef.current = project.code || ''
    setHasUnsavedChanges(false)
    setIsOpen(false)
    setMenuOpenId(null)
  }

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Delete this project?')) return
    await deleteProject(id)
    if (currentProject?.id === id) {
      setCurrentProject(null)
      setCode('// Welcome to oli\nsound("test_kick test_hihat test_kick test_hihat")\n')
      lastSavedCodeRef.current = ''
    }
    await loadProjects()
    setMenuOpenId(null)
  }

  const handleDuplicateProject = async (project: Project) => {
    try {
      const newProject = await duplicateProject(project.id)
      await loadProjects()
      setCurrentProject(newProject)
      lastSavedCodeRef.current = newProject.code || ''
      setHasUnsavedChanges(false)
    } catch {
      // Fallback: create a copy manually
      const copy = await createProject(`${project.name} copy`, project.code)
      await loadProjects()
      setCurrentProject(copy)
      lastSavedCodeRef.current = copy.code || ''
      setHasUnsavedChanges(false)
    }
    setMenuOpenId(null)
  }

  const handleStartRename = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(project.id)
    setEditName(project.name)
    setMenuOpenId(null)
  }

  const handleRename = async (project: Project) => {
    if (!editName.trim() || editName === project.name) {
      setEditingId(null)
      return
    }
    try {
      await updateProject(project.id, editName, project.code)
      await loadProjects()
      if (currentProject?.id === project.id) {
        setCurrentProject({ ...currentProject, name: editName })
      }
    } catch {
      // Failed to rename
    }
    setEditingId(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative" data-projects>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}
        className="flex items-center gap-1 text-[11px] text-[#555] hover:text-[#888] transition-colors"
      >
        <span className="text-[#7dd3fc] max-w-[120px] truncate">
          {currentProject?.name || 'untitled'}
        </span>
        {saving && <span className="text-[#a78bfa]">...</span>}
        {!saving && hasUnsavedChanges && currentProject && <span className="text-[#fbbf24]">•</span>}
        <span className="text-[#444]">▾</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[#111] border border-[#333] rounded z-50 overflow-hidden text-[11px] shadow-lg">
          {/* New project */}
          <div className="p-2 border-b border-[#333]">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="new project..."
                className="flex-1 bg-[#0a0a0a] border border-[#333] rounded px-2 py-1 outline-none text-[#888] placeholder:text-[#444] focus:border-[#555]"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
                className="px-2 py-1 text-[#4ade80] hover:bg-[#1a1a1a] rounded disabled:text-[#333]"
              >
                +
              </button>
            </div>
          </div>

          {/* Project list */}
          <div className="max-h-64 overflow-auto">
            {projects.length === 0 ? (
              <div className="px-3 py-3 text-[#444] text-center">
                no projects yet
              </div>
            ) : (
              <div className="py-1">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => handleLoadProject(project.id)}
                    className={`relative px-3 py-2 cursor-pointer group transition-colors ${
                      currentProject?.id === project.id
                        ? 'bg-[#1a1a1a]'
                        : 'hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {editingId === project.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleRename(project)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(project)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-[#0a0a0a] border border-[#555] rounded px-1 py-0.5 outline-none text-[#ccc]"
                          autoFocus
                        />
                      ) : (
                        <span className={`truncate flex-1 ${currentProject?.id === project.id ? 'text-[#7dd3fc]' : 'text-[#888]'}`}>
                          {project.name}
                        </span>
                      )}

                      {/* Actions button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === project.id ? null : project.id) }}
                        className="ml-2 px-1 text-[#444] hover:text-[#888] opacity-0 group-hover:opacity-100"
                      >
                        ···
                      </button>
                    </div>

                    <div className="text-[10px] text-[#444] mt-0.5">
                      {formatDate(project.updated_at)}
                    </div>

                    {/* Context menu */}
                    {menuOpenId === project.id && (
                      <div className="absolute right-2 top-full mt-1 w-28 bg-[#1a1a1a] border border-[#333] rounded shadow-lg z-10 overflow-hidden">
                        <button
                          onClick={(e) => handleStartRename(project, e)}
                          className="w-full px-3 py-1.5 text-left text-[#888] hover:bg-[#252525] hover:text-[#ccc]"
                        >
                          rename
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDuplicateProject(project) }}
                          className="w-full px-3 py-1.5 text-left text-[#888] hover:bg-[#252525] hover:text-[#ccc]"
                        >
                          duplicate
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id) }}
                          className="w-full px-3 py-1.5 text-left text-[#f87171] hover:bg-[#252525]"
                        >
                          delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with save all hint */}
          {currentProject && (
            <div className="px-3 py-2 border-t border-[#333] text-[10px] text-[#444]">
              auto-saves after changes
            </div>
          )}
        </div>
      )}
    </div>
  )
}
