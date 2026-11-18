import {
  LayoutDashboard,
  LineChart,
  Brain,
  MessageSquare,
  Settings,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'history', label: 'Historical Monitoring', icon: LineChart },
  { id: 'ai-analysis', label: 'AI Analysis', icon: Brain },
  { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquare },
  { id: 'settings', label: 'System Settings', icon: Settings },
]

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Activity className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold">AIoT Monitor</h1>
          <p className="text-xs text-muted-foreground">Vital Sign Dashboard</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              currentPage === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="border-t px-6 py-4">
        <p className="text-xs text-muted-foreground">FYP Project © 2026</p>
      </div>
    </aside>
  )
}
