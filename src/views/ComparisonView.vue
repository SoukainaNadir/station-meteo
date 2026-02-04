<template>
  <v-container fluid>
    <h1 class="text-h4 mb-6">
      <v-icon start>mdi-compare</v-icon>
      Comparaison des Sondes
    </h1>

    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-select
              v-model="selectedSensor"
              :items="sensorTypes"
              label="Type de capteur"
              prepend-icon="mdi-sensor"
              variant="outlined"
              density="comfortable"
            ></v-select>
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="selectedPeriod"
              :items="periods"
              label="Période"
              prepend-icon="mdi-calendar"
              variant="outlined"
              density="comfortable"
            ></v-select>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col
        v-for="sonde in meteoStore.sondes"
        :key="sonde.sonde_id"
        cols="12"
        md="4"
      >
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-map-marker</v-icon>
            {{ sonde.name }}
          </v-card-title>
          <v-card-text>
            <div class="text-h3 text-center my-4" :style="{ color: getSensorColor() }">
              {{ getSensorValue(sonde) }}
              <span class="text-h6">{{ getSensorUnit() }}</span>
            </div>
            <v-progress-linear
              :model-value="getProgressValue(sonde)"
              :color="getSensorColor()"
              height="8"
              rounded
            ></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-6">
      <v-card-title>
        <v-icon start>mdi-chart-line</v-icon>
        Évolution comparative
      </v-card-title>
      <v-card-text>
        <canvas ref="chartCanvas"></canvas>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useMeteoStore } from '@/stores/meteo'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const meteoStore = useMeteoStore()
const selectedSensor = ref('temperature')
const selectedPeriod = ref('24h')
const chartCanvas = ref(null)
let chart = null

const sensorTypes = [
  { title: 'Température', value: 'temperature' },
  { title: 'Humidité', value: 'humidity' },
  { title: 'Pression', value: 'pressure' },
  { title: 'Vent', value: 'wind_speed' },
  { title: 'Précipitations', value: 'rain' }
]

const periods = [
  { title: 'Dernières 24h', value: '24h' },
  { title: 'Dernière semaine', value: '7d' },
  { title: 'Dernier mois', value: '30d' }
]

const getSensorValue = (sonde) => {
  const value = sonde.measurements?.[selectedSensor.value]?.value
  return value ? value.toFixed(1) : '--'
}

const getSensorUnit = () => {
  const units = {
    temperature: '°C',
    humidity: '%',
    pressure: 'hPa',
    wind_speed: 'km/h',
    rain: 'mm'
  }
  return units[selectedSensor.value] || ''
}

const getSensorColor = () => {
  const colors = {
    temperature: '#FF7675',
    humidity: '#74B9FF',
    pressure: '#A29BFE',
    wind_speed: '#55EFC4',
    rain: '#0984E3'
  }
  return colors[selectedSensor.value] || '#666'
}

const getProgressValue = (sonde) => {
  const value = sonde.measurements?.[selectedSensor.value]?.value || 0
  const ranges = {
    temperature: { min: -10, max: 40 },
    humidity: { min: 0, max: 100 },
    pressure: { min: 980, max: 1040 },
    wind_speed: { min: 0, max: 100 },
    rain: { min: 0, max: 50 }
  }
  const range = ranges[selectedSensor.value]
  return ((value - range.min) / (range.max - range.min)) * 100
}

const createChart = () => {
  if (!chartCanvas.value) return

  if (chart) chart.destroy()

  const datasets = meteoStore.sondes.map((sonde, index) => ({
    label: sonde.name,
    data: Array.from({ length: 24 }, (_, i) => ({
      x: new Date(Date.now() - (23 - i) * 3600000),
      y: (sonde.measurements?.[selectedSensor.value]?.value || 0) + (Math.random() - 0.5) * 5
    })),
    borderColor: `hsl(${index * 137.5}, 70%, 50%)`,
    backgroundColor: `hsla(${index * 137.5}, 70%, 50%, 0.1)`,
    tension: 0.4
  }))

  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 3,
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: `Comparaison ${sensorTypes.find(s => s.value === selectedSensor.value)?.title}`
        }
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'hour' }
        },
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: getSensorUnit()
          }
        }
      }
    }
  })
}

watch([selectedSensor, selectedPeriod], () => {
  createChart()
})

onMounted(async () => {
  await meteoStore.fetchAllSondes()
  createChart()
})
</script>