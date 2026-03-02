import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { store } from '../store.js'
import { fetchProjects, createProject, getProject, deleteProject, type Project } from '../api.js'

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [currentId, setCurrentId] = useState<number | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const data = await fetchProjects()
      setProjects(data)
    } catch {
      // Backend not running
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (name: string) => {
    if (!name.trim()) {
      setCreating(false)
      return
    }
    try {
      const state = store.getState()
      const project = await createProject(name, state.code)
      setCurrentId(project.id)
      store.setState({ currentProject: project })
      await loadProjects()
    } catch {
      // Failed
    }
    setCreating(false)
    setNewName('')
  }

  const handleLoad = async (id: number) => {
    try {
      const project = await getProject(id)
      setCurrentId(id)
      store.setState({ currentProject: project, code: project.code })
    } catch {
      // Failed
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteProject(id)
      if (currentId === id) {
        setCurrentId(null)
        store.setState({ currentProject: null })
      }
      await loadProjects()
      if (selected >= projects.length - 1) {
        setSelected(Math.max(0, projects.length - 2))
      }
    } catch {
      // Failed
    }
  }

  useInput((input, key) => {
    const state = store.getState()
    if (state.panel !== 'projects') return

    if (creating) {
      if (key.escape) {
        setCreating(false)
        setNewName('')
      }
      return
    }

    if (key.downArrow || input === 'j') {
      setSelected(s => Math.min(s + 1, projects.length - 1))
    } else if (key.upArrow || input === 'k') {
      setSelected(s => Math.max(s - 1, 0))
    } else if (key.return) {
      if (projects[selected]) {
        handleLoad(projects[selected].id)
      }
    } else if (input === 'n') {
      setCreating(true)
    } else if (input === 'd' && projects[selected]) {
      handleDelete(projects[selected].id)
    }
  })

  const cols = 35
  const maxVisible = 10

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'just now'
      if (diffMins < 60) return `${diffMins}m`
      if (diffHours < 24) return `${diffHours}h`
      if (diffDays < 7) return `${diffDays}d`
      return date.toLocaleDateString()
    } catch {
      return ''
    }
  }

  return (
    <Box flexDirection="column" width={cols + 4}>
      {/* Header */}
      <Text color="cyan">┌{'─'.repeat(cols)}┐</Text>
      <Text color="cyan">│ projects{' '.repeat(cols - 9)}│</Text>
      <Text color="cyan">├{'─'.repeat(cols)}┤</Text>

      {/* New project input */}
      {creating && (
        <Box>
          <Text color="green">│ › </Text>
          <Box width={cols - 4}>
            <TextInput
              value={newName}
              onChange={setNewName}
              onSubmit={handleCreate}
              placeholder="project name..."
            />
          </Box>
          <Text color="cyan"> │</Text>
        </Box>
      )}

      {/* Content */}
      {loading ? (
        <Text color="gray">│ loading...{' '.repeat(cols - 11)}│</Text>
      ) : projects.length === 0 ? (
        <Text color="gray">│ no projects yet{' '.repeat(cols - 16)}│</Text>
      ) : (
        projects.slice(0, maxVisible).map((project, i) => {
          const isSelected = i === selected
          const isCurrent = project.id === currentId
          const icon = isCurrent ? '●' : '○'
          const time = formatDate(project.updated_at) || ''
          const projectName = project.name || 'untitled'
          const name = projectName.length > cols - 12
            ? projectName.substring(0, cols - 15) + '...'
            : projectName
          const pad = cols - name.length - time.length - 4

          return (
            <Text key={project.id} color={isSelected ? 'cyan' : isCurrent ? 'green' : 'gray'} inverse={isSelected}>
              │ {icon} {name}{' '.repeat(Math.max(1, pad))}{time} │
            </Text>
          )
        })
      )}

      {/* Fill remaining space */}
      {Array(Math.max(0, maxVisible - Math.max(projects.length, 1) - (creating ? 1 : 0))).fill(0).map((_, i) => (
        <Text key={`empty-${i}`} color="cyan">│{' '.repeat(cols)}│</Text>
      ))}

      {/* Footer */}
      <Text color="cyan">└{'─'.repeat(cols)}┘</Text>

      {/* Help */}
      <Text color="gray" dimColor>
        [n]ew  [enter] load  [d]elete
      </Text>
    </Box>
  )
}
