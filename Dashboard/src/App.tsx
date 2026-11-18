import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { OverviewPage } from '@/pages/OverviewPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { AIAnalysisPage } from '@/pages/AIAnalysisPage'
import { AIAssistantPage } from '@/pages/AIAssistantPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useLiveSensorData } from '@/hooks/useLiveSensorData'

const pageTitles: Record<string, string> = {
  overview: 'Overview',
  history: 'Historical Monitoring',
  'ai-analysis': 'AI Analysis',
  'ai-assistant': 'AI Assistant',
  settings: 'System Settings',
}

function App() {
  const [currentPage, setCurrentPage] = useState('overview')
  const {
    readings,
    currentReading,
    predictions,
    evaluations,
    deviceStatus,
    deviceConfig,
    updateDeviceConfig,
    isRealtime,
  } = useLiveSensorData()

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return (
          <OverviewPage
            readings={readings}
            currentReading={currentReading}
            predictions={predictions}
          />
        )
      case 'history':
        return <HistoryPage liveReadings={readings} />
      case 'ai-analysis':
        return (
          <AIAnalysisPage
            predictions={predictions}
            evaluations={evaluations}
          />
        )
      case 'ai-assistant':
        return <AIAssistantPage />
      case 'settings':
        return (
          <SettingsPage
            deviceConfig={deviceConfig}
            deviceStatus={deviceStatus}
            onSaveConfig={updateDeviceConfig}
          />
        )
      default:
        return (
          <OverviewPage
            readings={readings}
            currentReading={currentReading}
            predictions={predictions}
          />
        )
    }
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={pageTitles[currentPage] ?? 'Dashboard'}
          deviceStatus={deviceStatus}
          isRealtime={isRealtime}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App
