import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  mockCurrentReading,
  generateMockReadings,
  mockPredictions,
  mockDeviceStatus,
  mockModelEvaluations,
  mockDeviceConfig,
} from '@/data/mock-data'
import type { SensorReading, AIPrediction, ModelEvaluation, DeviceStatus, DeviceConfig } from '@/types'

export function useLiveSensorData() {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [currentReading, setCurrentReading] = useState<SensorReading>(mockCurrentReading)
  const [predictions, setPredictions] = useState<AIPrediction[]>(mockPredictions)
  const [evaluations, setEvaluations] = useState<ModelEvaluation[]>(mockModelEvaluations)
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(mockDeviceStatus)
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig>(mockDeviceConfig)
  const [loading, setLoading] = useState<boolean>(true)

  // Function to save device config to Supabase
  const updateDeviceConfig = useCallback(async (newConfig: Partial<DeviceConfig>) => {
    const updated = {
      ...deviceConfig,
      ...newConfig,
      updated_at: new Date().toISOString(),
    }
    setDeviceConfig(updated)

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('device_configs')
          .upsert(updated)
        if (error) {
          console.error('Failed to update device_configs:', error)
          return false
        }
        return true
      } catch (err) {
        console.error('Error saving device config:', err)
        return false
      }
    }
    return true
  }, [deviceConfig])

  useEffect(() => {
    // If Supabase is not configured, fall back to mock data
    if (!isSupabaseConfigured || !supabase) {
      const initial = generateMockReadings(30, 1)
      setReadings(initial)
      setCurrentReading(initial[initial.length - 1] ?? mockCurrentReading)
      setLoading(false)
      return
    }

    let isMounted = true

    // 1. Initial fetch of sensor_readings
    async function loadData() {
      try {
        const { data: sensorData, error: sensorError } = await supabase!
          .from('sensor_readings')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(50)

        if (!sensorError && sensorData && sensorData.length > 0) {
          if (isMounted) {
            const chronological = [...sensorData].reverse() as SensorReading[]
            setReadings(chronological)
            const latest = sensorData[0] as SensorReading
            setCurrentReading(latest)
            setDeviceStatus((prev) => ({
              ...prev,
              device_id: latest.device_id,
              is_online: Date.now() - new Date(latest.recorded_at).getTime() < 60000,
              last_seen: latest.recorded_at,
              last_successful_transmission: latest.recorded_at,
              error_count: 0,
            }))
          }
        } else {
          const initial = generateMockReadings(30, 1)
          if (isMounted) {
            setReadings(initial)
            setCurrentReading(initial[initial.length - 1] ?? mockCurrentReading)
          }
        }

        // 2. Fetch AI Predictions
        const { data: predData } = await supabase!
          .from('ai_predictions')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(10)

        if (isMounted && predData && predData.length > 0) {
          setPredictions(predData as AIPrediction[])
        }

        // 3. Fetch Model Evaluations
        const { data: evalData } = await supabase!
          .from('model_evaluations')
          .select('*')
          .order('f1_score', { ascending: false })

        if (isMounted && evalData && evalData.length > 0) {
          setEvaluations(evalData as ModelEvaluation[])
        }

        // 4. Fetch Device Config
        const { data: cfgData } = await supabase!
          .from('device_configs')
          .select('*')
          .eq('device_id', 'esp32_prototype_01')
          .maybeSingle()

        if (isMounted && cfgData) {
          setDeviceConfig(cfgData as DeviceConfig)
          setDeviceStatus((prev) => ({
            ...prev,
            hardware_model: cfgData.hardware_model || prev.hardware_model,
            firmware_version: cfgData.firmware_version || prev.firmware_version,
          }))
        }
      } catch (err) {
        console.error('Error fetching data from Supabase:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    // 5. Subscribe to Realtime inserts on sensor_readings
    const channel = supabase
      .channel('sensor_readings_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          const newReading = payload.new as SensorReading
          setReadings((prev) => {
            const updated = [...prev, newReading]
            return updated.length > 100 ? updated.slice(updated.length - 100) : updated
          })
          setCurrentReading(newReading)
          setDeviceStatus((prev) => ({
            ...prev,
            device_id: newReading.device_id,
            is_online: true,
            last_seen: newReading.recorded_at,
            last_successful_transmission: newReading.recorded_at,
            error_count: 0,
          }))
        }
      )
      .subscribe()

    // Realtime for ai_predictions
    const predChannel = supabase
      .channel('ai_predictions_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_predictions' },
        (payload) => {
          const newPred = payload.new as AIPrediction
          setPredictions((prev) => [newPred, ...prev.slice(0, 9)])
        }
      )
      .subscribe()

    // Realtime for device_configs
    const cfgChannel = supabase
      .channel('device_configs_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'device_configs' },
        (payload) => {
          if (payload.new) {
            setDeviceConfig(payload.new as DeviceConfig)
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      if (supabase) {
        supabase.removeChannel(channel)
        supabase.removeChannel(predChannel)
        supabase.removeChannel(cfgChannel)
      }
    }
  }, [])

  return {
    readings,
    currentReading,
    predictions,
    evaluations,
    deviceStatus,
    deviceConfig,
    updateDeviceConfig,
    loading,
    isRealtime: isSupabaseConfigured,
  }
}
