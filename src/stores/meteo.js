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

      const requestParams = {
        data: 'temperature,humidity,pressure,wind_speed,wind_direction,rain'
      }

      console.log('📡 Sending request to /meteo/v1/live')
      console.log('   Params:', requestParams)

      try {
        const response = await axios.get('/meteo/v1/live', {
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

      try {
        const end = Math.floor(Date.now() / 1000)
        const start = end - (period.hours * 3600)

        const response = await axios.get('/meteo/v1/archive', {
          params: { start, end }
        })

        const { legend, data } = response.data
        const timeIndex = legend.indexOf('time')
        const measurementIndex = legend.indexOf(measurementType)

        const parsedData = data.map(row => ({
          time: row[timeIndex],
          value: row[measurementIndex]
        }))

        return parsedData
      } catch (err) {
        this.error = 'Erreur lors du chargement de l\'historique'
        console.error('Erreur fetchArchiveDataByPeriod:', err)
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