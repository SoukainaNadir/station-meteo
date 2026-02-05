import { defineStore } from 'pinia'
import axios from 'axios'

export const useMeteoStore = defineStore('meteo', {
  state: () => ({
    sondes: [],
    selectedSonde: null,
    archiveData: null,
    loading: false,
    error: null
  }),

  getters: {
    getSondeById: (state) => (sondeId) => {
      return state.sondes.find(s => s.sonde_id === sondeId)
    },
    activeSondesCount: (state) => {
      return state.sondes.length
    },
    allTemperatures: (state) => {
      return state.sondes.map(s => ({
        sonde_id: s.sonde_id,
        name: s.name,
        value: s.measurements?.temperature?.value
      }))
    }
  },

  actions: {
    async fetchAllSondes() {
      console.log('=== FRONTEND: fetchAllSondes() ===')
      this.loading = true
      this.error = null

      const BASE_URL = 'http://localhost:3000'     

      const requestParams = {
        data: 'temperature,humidity,pressure,wind_speed,wind_direction,rain,luminosity,wind_heading,wind_speed_avg,wind_speed_max,wind_speed_min'
      }

      console.log('📡 Sending request to /meteo/v1/live')
      console.log('   Params:', requestParams)

      try {
        const response = await axios.get(`${BASE_URL}/meteo/v1/live`, {
          params: requestParams
        })
        console.log('✅ Response received:', response.status)
        console.log('   Data:', JSON.stringify(response.data, null, 2))

        this.sondes = [
          {
            sonde_id: 'sonde_01',
            name: 'Sonde Principale',
            ...response.data.data
          }
        ]

        console.log('✅ Sondes updated in store:', this.sondes.length, 'sonde(s)')
        console.log('   Sonde details:', this.sondes[0])
        console.log('================================\n')

        return this.sondes
      } catch (err) {
        console.error('❌ Error in fetchAllSondes:')
        console.error('   Message:', err.message)
        console.error('   Response:', err.response?.data)
        console.error('   Status:', err.response?.status)
        console.error('   Full error:', err)
        console.log('================================\n')

        this.error = 'Erreur lors du chargement des sondes'
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchArchiveDataByPeriod(sondeId, period, measurementType = 'temperature') {
      this.loading = true
      this.error = null

      const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

      try {
        const end = Math.floor(Date.now() / 1000)
        const start = end - (period.hours * 3600)

        console.log('📊 Fetching archive data:', { start, end, measurementType })

        const response = await axios.get(`${BASE_URL}/meteo/v1/archive`, {
          params: { start, end }
        })

        console.log('✅ Archive response:', response.data)

        // Check if response has the expected structure
        if (!response.data) {
          throw new Error('No data in response')
        }

        const { legend, data } = response.data

        // Validate legend and data exist
        if (!legend || !Array.isArray(legend)) {
          console.error('Invalid legend:', legend)
          throw new Error('Invalid response format: missing or invalid legend')
        }

        if (!data || !Array.isArray(data)) {
          console.error('Invalid data:', data)
          throw new Error('Invalid response format: missing or invalid data array')
        }

        const timeIndex = legend.indexOf('time')
        const measurementIndex = legend.indexOf(measurementType)

        if (timeIndex === -1) {
          throw new Error(`Time field not found in legend: ${legend.join(', ')}`)
        }

        if (measurementIndex === -1) {
          throw new Error(`Measurement type '${measurementType}' not found in legend: ${legend.join(', ')}`)
        }

        const parsedData = data.map(row => ({
          time: row[timeIndex],
          value: row[measurementIndex]
        }))

        console.log('✅ Parsed data points:', parsedData.length)
        return parsedData
      } catch (err) {
        this.error = 'Erreur lors du chargement de l\'historique'
        console.error('❌ Erreur fetchArchiveDataByPeriod:', err)
        console.error('   Full error:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    async refresh() {
      await this.fetchAllSondes()
    }
  }
})