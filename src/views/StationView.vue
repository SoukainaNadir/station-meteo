<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useMeteoStore } from "@/stores/meteo";
import SensorCard from "@/components/widgets/SensorCard.vue";
import ChartWidget from "@/components/widgets/ChartWidget.vue";
import websocketService from "@/services/websocket.service";

const route = useRoute();
const meteoStore = useMeteoStore();

const sondeId = computed(() => route.params.id);
const station = computed(() => meteoStore.getSondeById(sondeId.value));

const wsConnected = ref(false);
let unsubscribe = null;

const chartLoading = ref(false);
const temperatureData = ref([]);
const humidityData = ref([]);
const pressureData = ref([]);

const defaultPeriod = { label: '24h', value: '24h', hours: 24 };

const selectedTempPeriod = ref('24h')
const selectedHumidityPeriod = ref('24h')
const selectedPressurePeriod = ref('24h')

const loadTemperatureData = async (period) => {
  chartLoading.value = true;
  try {
    const data = await meteoStore.fetchArchiveDataByPeriod(
      sondeId.value, 
      period,
      'temperature'  
    );
    temperatureData.value = data;
  } catch (err) {
    console.error("Erreur chargement température:", err);
  } finally {
    chartLoading.value = false;
  }
};

const loadHumidityData = async (period) => {
  chartLoading.value = true;
  try {
    const data = await meteoStore.fetchArchiveDataByPeriod(
      sondeId.value, 
      period,
      'humidity'  
    );
    humidityData.value = data;
  } catch (err) {
    console.error("Erreur chargement humidité:", err);
  } finally {
    chartLoading.value = false;
  }
};

const loadPressureData = async (period) => {
  chartLoading.value = true;
  try {
    const data = await meteoStore.fetchArchiveDataByPeriod(
      sondeId.value, 
      period,
      'pressure'  
    );
    pressureData.value = data;
  } catch (err) {
    console.error("Erreur chargement pression:", err);
  } finally {
    chartLoading.value = false;
  }
};

const handleTemperaturePeriodChange = (period) => {
  console.log('Période température changée:', period);
  selectedTempPeriod.value = period.value
  loadTemperatureData(period);
};
const handleHumidityPeriodChange = (period) => {
  selectedTempPeriod.value = period.value
  loadHumidityData(period);
};

const handlePressurePeriodChange = (period) => {
  selectedTempPeriod.value = period.value
  loadPressureData(period);
};

const loadStationData = async () => {
  try {
    if (meteoStore.sondes.length === 0) {
      await meteoStore.fetchAllSondes();
    }
    
    await Promise.all([
      loadTemperatureData(defaultPeriod),
      loadHumidityData(defaultPeriod),
      loadPressureData(defaultPeriod)
    ]);
  } catch (err) {
    console.error("Erreur:", err);
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "--";
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 1) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffMinutes < 1440) return `Il y a ${Math.floor(diffMinutes / 60)} h`;
  return date.toLocaleDateString("fr-FR");
};

onMounted(() => {
  loadStationData();

  const wsUrl = 'wss://websocketking.com'; 
  
  try {
    websocketService.connect(sondeId.value, wsUrl);
    wsConnected.value = true;
    
    unsubscribe = websocketService.subscribe(
      sondeId.value,
      'sensor-update',
      (data) => {
        console.log('Mise à jour WebSocket reçue:', data);
        meteoStore.refresh();
      }
    );
  } catch (err) {
    console.error('Erreur WebSocket:', err);
    wsConnected.value = false;
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
  websocketService.disconnect(sondeId.value);
});
</script>

<template>
  <v-container fluid>
    <v-row v-if="!station">
      <v-col cols="12" class="text-center py-12">
        <v-icon size="64" color="grey">mdi-alert-circle</v-icon>
        <p class="text-h6 mt-4">Station introuvable</p>
        <v-btn color="primary" to="/" class="mt-4">
          Retour à la carte
        </v-btn>
      </v-col>
    </v-row>

    <template v-if="station">
      <v-row>
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center bg-primary">
              <v-icon start size="large">mdi-map-marker</v-icon>
              <div>
                <div class="text-h5">{{ station.name }}</div>
                <div class="text-caption">
                  {{ station.location.lat.toFixed(4) }}°N, 
                  {{ station.location.long.toFixed(4) }}°E
                </div>
              </div>
              <v-spacer></v-spacer>
              <v-chip
                :color="wsConnected ? 'success' : 'grey'"
                size="small"
                variant="flat"
              >
                <v-icon start :icon="wsConnected ? 'mdi-wifi' : 'mdi-wifi-off'"></v-icon>
                {{ wsConnected ? 'Connecté' : 'Hors ligne' }}
              </v-chip>
            </v-card-title>
            
            <v-card-subtitle class="pt-3">
              <v-icon start size="small">mdi-clock-outline</v-icon>
              Dernière mise à jour: {{ formatDate(station.timestamp) }}
            </v-card-subtitle>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12" sm="6" md="4">
          <SensorCard
            icon="mdi-thermometer"
            label="Température"
            :value="station.measurements?.temperature?.value?.toFixed(1) || '--'"
            :unit="station.measurements?.temperature?.unit || '°C'"
            color="#FF7675"
          />
        </v-col>

        <v-col cols="12" sm="6" md="4">
          <SensorCard
            icon="mdi-water-percent"
            label="Humidité"
            :value="station.measurements?.humidity?.value?.toFixed(0) || '--'"
            :unit="station.measurements?.humidity?.unit || '%'"
            color="#74B9FF"
          />
        </v-col>

        <v-col cols="12" sm="6" md="4">
          <SensorCard
            icon="mdi-weather-windy"
            label="Vitesse du vent"
            :value="station.measurements?.wind_speed?.value?.toFixed(1) || '--'"
            :unit="station.measurements?.wind_speed?.unit || 'km/h'"
            color="#55EFC4"
          />
        </v-col>

        <v-col cols="12" sm="6" md="4">
          <SensorCard
            icon="mdi-gauge"
            label="Pression"
            :value="station.measurements?.pressure?.value?.toFixed(1) || '--'"
            :unit="station.measurements?.pressure?.unit || 'hPa'"
            color="#A29BFE"
          />
        </v-col>

        <v-col cols="12" sm="6" md="4">
          <SensorCard
            icon="mdi-weather-rainy"
            label="Précipitations"
            :value="station.measurements?.rain?.value?.toFixed(1) || '--'"
            :unit="station.measurements?.rain?.unit || 'mm'"
            color="#0984E3"
          />
        </v-col>
      </v-row>

      <v-row v-if="meteoStore.loading">
        <v-col cols="12" class="text-center py-12">
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
          ></v-progress-circular>
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

      <v-row v-if="!meteoStore.loading && station" class="mt-6">
        <v-col cols="12">
          <ChartWidget
            :key="`temp-${selectedTempPeriod}`" 
            title="Température"
            icon="mdi-thermometer"
            :data="temperatureData"
            :loading="chartLoading"
            color="#FF7675"
            unit="°C"
            @period-change="handleTemperaturePeriodChange"
          />
        </v-col>

        <v-col cols="12" md="6">
          <ChartWidget
            :key="`humidity-${selectedHumidityPeriod}`"
            title="Humidité"
            icon="mdi-water-percent"
            :data="humidityData"
            :loading="chartLoading"
            color="#74B9FF"
            unit="%"
            @period-change="handleHumidityPeriodChange"
          />
        </v-col>

        <v-col cols="12" md="6">
          <ChartWidget
          :key="`pressure-${selectedPressurePeriod}`"
            title="Pression atmosphérique"
            icon="mdi-gauge"
            :data="pressureData"
            :loading="chartLoading"
            color="#A29BFE"
            unit="hPa"
            @period-change="handlePressurePeriodChange"
          />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>