import { Wifi, WifiOff, Clock, Cloud } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'
import type { DeviceStatus } from '@/types'

interface HeaderProps {
  title: string
  deviceStatus: DeviceStatus
  isRealtime?: boolean
}

export function Header({ title, deviceStatus, isRealtime = false }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-card px-6 py-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="flex items-center gap-4">
        {isRealtime && (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
            <Cloud className="mr-1 h-3 w-3 text-emerald-500" /> Supabase Realtime
          </Badge>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Updated {formatRelativeTime(deviceStatus.last_seen)}</span>
        </div>
        <Badge variant={deviceStatus.is_online ? 'default' : 'destructive'}>
          {deviceStatus.is_online ? (
            <>
              <Wifi className="mr-1 h-3 w-3" /> Online
            </>
          ) : (
            <>
              <WifiOff className="mr-1 h-3 w-3" /> Offline
            </>
          )}
        </Badge>
      </div>
    </header>
  )
}
