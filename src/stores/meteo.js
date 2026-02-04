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
      this.loading = true
      this.error = null

      try {
        const response = await axios.get('/meteo/v1/live', {
          params: {
            data: 'temperature,humidity,pressure,wind_speed,wind_direction,rain'
          }
        })

        this.sondes = [
          {
            sonde_id: 'sonde_01',
            name: 'Sonde Principale',
            ...response.data.data
          }
        ]

        return this.sondes
      } catch (err) {
        this.error = 'Erreur lors du chargement des sondes'
        console.error('Erreur fetchAllSondes:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    async fetchArchiveDataByPeriod(sondeId, period) {
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
        const tempIndex = legend.indexOf('temperature')

        const parsedData = data.map(row => ({
          time: row[timeIndex],
          value: row[tempIndex]
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