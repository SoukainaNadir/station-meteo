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
        const response = await axios.get('/api/live')
        
        this.sondes = [
          {
            sonde_id: 'sonde_01',
            name: 'Campus Est',
            ...response.data.data,
            location: { lat: 48.8417, long: 2.5875 }
          },
          {
            sonde_id: 'sonde_02',
            name: 'Campus Ouest',
            ...response.data.data,
            location: { lat: 48.8397, long: 2.5825 },
            measurements: {
              ...response.data.data.measurements,
              temperature: { unit: '°C', value: 21.8 },
              humidity: { unit: '%', value: 68 }
            }
          },
          {
            sonde_id: 'sonde_03',
            name: 'Bâtiment Sciences',
            ...response.data.data,
            location: { lat: 48.8437, long: 2.5905 },
            measurements: {
              ...response.data.data.measurements,
              temperature: { unit: '°C', value: 23.2 },
              humidity: { unit: '%', value: 62 }
            }
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

    generateMockArchiveData(sondeId, hours = 24) {
      const now = new Date()
      const data = []
      const interval = hours <= 2 ? 5 : hours <= 24 ? 60 : 360 // minutes
      const points = Math.floor((hours * 60) / interval)
      
      const sonde = this.getSondeById(sondeId)
      const baseTemp = sonde?.measurements?.temperature?.value || 20
      
      for (let i = points; i >= 0; i--) {
        const time = new Date(now - i * interval * 60000)
        
        // Variation sinusoïdale pour simuler le cycle jour/nuit
        const hourOfDay = time.getHours()
        const dailyVariation = Math.sin((hourOfDay - 6) * Math.PI / 12) * 5
        const randomVariation = (Math.random() - 0.5) * 2
        
        data.push({
          time: time.toISOString(),
          value: baseTemp + dailyVariation + randomVariation
        })
      }
      
      return data
    },

    async fetchArchiveDataByPeriod(sondeId, period) {
      this.loading = true
      this.error = null

      try {
        const hours = period.hours
        const data = this.generateMockArchiveData(sondeId, hours)
        
        return data
      } catch (err) {
        this.error = 'Erreur lors du chargement de l\'historique'
        console.error('Erreur fetchArchiveDataByPeriod:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    selectSonde(sondeId) {
      this.selectedSonde = this.getSondeById(sondeId)
    },

    async refresh() {
      await this.fetchAllSondes()
    }
  }
})