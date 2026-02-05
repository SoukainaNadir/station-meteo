<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <div>
            <h1 class="text-h3 font-weight-bold">
              <v-icon size="40" color="primary" class="mr-2">mdi-weather-partly-cloudy</v-icon>
              Station Météo
            </h1>
            <div class="text-subtitle-1 text-grey mt-2">
              <v-icon size="small" class="mr-1">mdi-map-marker</v-icon>
              {{ stationLocation?.lat }}, {{ stationLocation?.long }}
            </div>
            <div class="text-caption text-grey">
              <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
              Dernière mise à jour: {{ formatDate(lastUpdate) }}
            </div>
          </div>

          <v-spacer></v-spacer>

          <v-btn 
            icon 
            size="large"
            variant="tonal"
            @click="meteoStore.refresh()"
            :loading="meteoStore.loading"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row v-if="!meteoStore.loading && liveData">
      <v-col cols="12" sm="6" md="4">
        <SensorCard
          icon="mdi-thermometer"
          label="Température"
          :value="measurements.temperature?.value?.toFixed(2) || '--'"
          :unit="measurements.temperature?.unit || '°C'"
          color="#FF7675"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <SensorCard
          icon="mdi-water-percent"
          label="Humidité"
          :value="measurements.humidity?.value?.toFixed(2) || '--'"
          :unit="measurements.humidity?.unit || '%'"
          color="#74B9FF"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <SensorCard
          icon="mdi-weather-windy"
          label="Vitesse du vent"
          :value="measurements.wind_speed_avg?.value?.toFixed(1) || '--'"
          :unit="measurements.wind_speed_avg?.unit || 'km/h'"
          color="#55EFC4"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <SensorCard
          icon="mdi-gauge"
          label="Pression"
          :value="measurements.pressure?.value?.toFixed(1) || '--'"
          :unit="measurements.pressure?.unit || 'hPa'"
          color="#A29BFE"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <SensorCard
          icon="mdi-weather-rainy"
          label="Précipitations"
          :value="measurements.rain?.value?.toFixed(1) || '--'"
          :unit="measurements.rain?.unit || 'mm'"
          color="#0984E3"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <SensorCard
          icon="mdi-compass"
          label="Direction du vent"
          :value="getWindDirection(measurements.wind_heading.value)"
          :unit="measurements.wind_heading.value ? `${measurements.wind_heading.value}°` : ''"
          color="#FDCB6E"
        />
      </v-col>
    </v-row>

    <v-row v-if="meteoStore.loading && !liveData">
      <v-col cols="12" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4 text-grey">Chargement des données...</p>
      </v-col>
    </v-row>

    <v-row v-if="meteoStore.error">
      <v-col cols="12">
        <v-alert type="error" variant="tonal">
          {{ meteoStore.error }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-if="!meteoStore.loading && meteoStore.archiveData" class="mt-6">
      <v-col cols="12">
        <ChartWidget
          title="Historique de température"
          icon="mdi-thermometer"
          :data="temperatureHistory"
          color="#FF7675"
          unit="°C"
        />
      </v-col>

      <v-col cols="12" md="6">
        <ChartWidget
          title="Historique d'humidité"
          icon="mdi-water-percent"
          :data="humidityHistory"
          color="#74B9FF"
          unit="%"
        />
      </v-col>

      <v-col cols="12" md="6">
        <ChartWidget
          title="Historique de pression"
          icon="mdi-gauge"
          :data="pressureHistory"
          color="#A29BFE"
          unit="hPa"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useMeteoStore } from '@/stores/meteo'
import SensorCard from '@/components/widgets/SensorCard.vue'
import ChartWidget from '@/components/widgets/ChartWidget.vue'

const meteoStore = useMeteoStore()

const liveData = computed(() => meteoStore.sondes[0])
const measurements = computed(() => liveData.value?.measurements || {})
const stationLocation = computed(() => liveData.value?.location)
const lastUpdate = computed(() => liveData.value?.date)
const temperatureHistory = computed(() => meteoStore.archiveData?.temperature || [])
const humidityHistory = computed(() => meteoStore.archiveData?.humidity || [])
const pressureHistory = computed(() => meteoStore.archiveData?.pressure || [])

const getWindDirection = (degrees) => {
  if (degrees === null || degrees === undefined) return '--'
  
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

const formatDate = (dateString) => {
  if (!dateString) return '--'
  const date = new Date(dateString)
  const now = new Date()
  const diffMinutes = Math.floor((now - date) / 60000)
  
  if (diffMinutes < 1) return 'À l\'instant'
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`
  if (diffMinutes < 1440) return `Il y a ${Math.floor(diffMinutes / 60)} h`
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  await meteoStore.fetchAllSondes()
})
</script>