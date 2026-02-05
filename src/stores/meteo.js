import { defineStore } from 'pinia'
import axios from 'axios'
import { SERVERS } from '@/config/servers'

const requestParams = {
  data: 'temperature,humidity,pressure,wind_speed,wind_direction,rain,luminosity,wind_heading,wind_speed_avg,wind_speed_max,wind_speed_min'
}

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
      return state.sondes.filter(s => s.status === 'online').length
    },
    allTemperatures: (state) => {
      return state.sondes
        .filter(s => s.status === 'online')
        .map(s => ({
          sonde_id: s.sonde_id,
          name: s.name,
          value: s.measurements?.temperature?.value
        }))
    }
  },

  actions: {
    async fetchAllSondes() {
      this.loading = true
      this.error = null
      this.sondes = []

      console.log(`Interrogation de ${SERVERS.length} serveurs...`)

      const requests = SERVERS.map(server => 
        axios.get(`${server.url}/meteo/v1/live`, {
          params: requestParams,
          timeout: 5000
        })
        .then(response => {
          console.log(`✓ ${server.name} (${server.url}): OK`)
          return {
            sonde_id: server.id,
            name: server.name,
            server_url: server.url,
            ...response.data.data,
            status: 'online'
          }
        })
        .catch(err => {
          console.error(`✗ ${server.name} (${server.url}): ${err.message}`)
          return {
            sonde_id: server.id,
            name: server.name,
            server_url: server.url,
            measurements: null,
            status: 'offline',
            error: err.message
          }
        })
      )

      this.sondes = await Promise.all(requests)
      this.loading = false

      const onlineCount = this.sondes.filter(s => s.status === 'online').length
      console.log(`Résultat: ${onlineCount}/${SERVERS.length} stations actives`)

      return this.sondes
    },

    async fetchArchiveDataByPeriod(sondeId, period, measurementType = 'temperature') {
      this.loading = true
      this.error = null

      const sonde = this.sondes.find(s => s.sonde_id === sondeId)
      if (!sonde) throw new Error('Sonde introuvable')
      if (sonde.status === 'offline') throw new Error('Station hors ligne')

      try {
        const end = Math.floor(Date.now() / 1000)
        const start = end - (period.hours * 3600)

        const response = await axios.get(`${sonde.server_url}/meteo/v1/archive`, {
          params: { start, end }
        })

        if (!response.data) throw new Error('No data in response')

        const { legend, data } = response.data

        if (!legend || !Array.isArray(legend)) {
          throw new Error('Invalid response format: missing or invalid legend')
        }

        if (!data || !Array.isArray(data)) {
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
          value: measurementType === 'rain' ? Math.max(0, row[measurementIndex]) : row[measurementIndex]
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

    updateSondeMeasurements(sondeId, newData) {
      const index = this.sondes.findIndex(s => s.sonde_id === sondeId)
      if (index !== -1 && newData.measurements) {
        this.sondes[index] = {
          ...this.sondes[index],
          measurements: { ...newData.measurements },
          date: newData.date
        }
      }
    },

    async refresh() {
      await this.fetchAllSondes()
    }
  }
})