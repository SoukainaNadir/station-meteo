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

// WebSocket
const wsConnected = ref(false);
let unsubscribe = null;

// Variables pour les graphiques
const chartLoading = ref(false);
const temperatureData = ref([]);
const humidityData = ref([]);
const pressureData = ref([]);

// Fonction pour charger les données historiques
const loadChartData = async (period) => {
  chartLoading.value = true;
  
  try {
    const data = await meteoStore.fetchArchiveDataByPeriod(sondeId.value, period);
    
    temperatureData.value = data.map(item => ({
      time: item.time,
      value: item.value
    }));
    
    humidityData.value = data.map(item => ({
      time: item.time,
      value: item.value * 0.3 + 50
    }));
    
    pressureData.value = data.map(item => ({
      time: item.time,
      value: 1013 + (item.value - 20) * 2
    }));
    
  } catch (err) {
    console.error("Erreur chargement historique:", err);
  } finally {
    chartLoading.value = false;
  }
};

const handlePeriodChange = (period) => {
  loadChartData(period);
};

const loadStationData = async () => {
  try {
    if (meteoStore.sondes.length === 0) {
      await meteoStore.fetchAllSondes();
    }
    await loadChartData({ label: '24h', value: '24h', hours: 24 });
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
    
    // S'abonner aux mises à jour
    unsubscribe = websocketService.subscribe(
      sondeId.value,
      'sensor-update',
      (data) => {
        console.log('📡 Mise à jour reçue:', data);
        
        // Mettre à jour la station dans le store
        const index = meteoStore.sondes.findIndex(s => s.sonde_id === sondeId.value);
        if (index !== -1 && data.measurements) {
          meteoStore.sondes[index].measurements = data.measurements;
          meteoStore.sondes[index].date = data.date || new Date().toISOString();
        }
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
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-4">
          <v-btn icon variant="text" @click="$router.push('/')">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>

          <div class="ml-4">
            <div class="d-flex align-center">
              <h1 class="text-h4 font-weight-bold">
                {{ station?.name || `Sonde ${sondeId}` }}
              </h1>
              
              <!-- Indicateur WebSocket -->
              <v-chip 
                :color="wsConnected ? 'success' : 'grey'" 
                size="small" 
                class="ml-3"
              >
                <v-icon start size="x-small">
                  {{ wsConnected ? 'mdi-wifi' : 'mdi-wifi-off' }}
                </v-icon>
                {{ wsConnected ? 'Temps réel' : 'Hors ligne' }}
              </v-chip>
            </div>
            
            <div class="text-subtitle-1 text-grey">
              <v-icon size="small" class="mr-1">mdi-map-marker</v-icon>
              {{ station?.location?.lat }}, {{ station?.location?.long }}
            </div>
            <div class="text-caption text-grey">
              <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
              Dernière mise à jour: {{ formatDate(station?.date) }}
            </div>
          </div>

          <v-spacer></v-spacer>

          <v-btn
            icon
            variant="text"
            @click="loadStationData()"
            :loading="meteoStore.loading"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row v-if="!meteoStore.loading && station">
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
          title="Température"
          icon="mdi-thermometer"
          :data="temperatureData"
          :loading="chartLoading"
          color="#FF7675"
          unit="°C"
          @period-change="handlePeriodChange"
        />
      </v-col>

      <v-col cols="12" md="6">
        <ChartWidget
          title="Humidité"
          icon="mdi-water-percent"
          :data="humidityData"
          :loading="chartLoading"
          color="#74B9FF"
          unit="%"
          @period-change="handlePeriodChange"
        />
      </v-col>

      <v-col cols="12" md="6">
        <ChartWidget
          title="Pression atmosphérique"
          icon="mdi-gauge"
          :data="pressureData"
          :loading="chartLoading"
          color="#A29BFE"
          unit="hPa"
          @period-change="handlePeriodChange"
        />
      </v-col>
    </v-row>
  </v-container>
</template>