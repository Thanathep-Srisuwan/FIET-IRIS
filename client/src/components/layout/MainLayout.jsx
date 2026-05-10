import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleDarkMode = () => setIsDark(prev => !prev)

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-col h-full flex-shrink-0">
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm md:hidden z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <div
        className={`fixed left-0 top-0 h-full z-50 transform transition-transform duration-500 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0">
        <Topbar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
          isDark={isDark} 
          toggleDarkMode={toggleDarkMode}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-900 transition-colors custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
