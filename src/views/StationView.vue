<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useMeteoStore } from "@/stores/meteo";
import SensorCard from "@/components/widgets/SensorCard.vue";
import ChartWidget from "@/components/widgets/ChartWidget.vue";
import websocketService from "@/services/websocket.service";
const route = useRoute();
const meteoStore = useMeteoStore();

const sondeId = computed(() => route.params.id);
const station = computed(() => meteoStore.getSondeById(sondeId.value));
const measurements = computed(() => station.value?.measurements || {});

const wsConnected = ref(false);
let unsubscribe = null;

const chartLoading = ref(false);
const temperatureData = ref([]);
const humidityData = ref([]);
const pressureData = ref([]);
const rainData = ref([]);

const defaultPeriod = { label: "24h", value: "24h", hours: 24 };

const activeChartTab = ref("temp");
const selectedTempPeriod = ref("24h");
const selectedHumidityPeriod = ref("24h");
const selectedPressurePeriod = ref("24h");
const selectedRainPeriod = ref("24h");
const lastUpdateTime = ref(null);
const tableHeaders = [
  { title: "Heure", key: "time", sortable: true },
  { title: "Température", key: "temperature", sortable: true },
  { title: "Humidité", key: "humidity", sortable: true },
  { title: "Pression", key: "pressure", sortable: true },
  { title: "Pluie", key: "rain", sortable: true },
];

const tableData = computed(() => {
  if (!temperatureData.value.length) return [];

  const combined = temperatureData.value.map((tempItem, index) => {
    const humItem = humidityData.value[index] || {};
    const pressItem = pressureData.value[index] || {};
    const rainItem = rainData.value[index] || {};

    return {
      time: tempItem.time,
      temperature: tempItem.value?.toFixed(1) || "--",
      humidity: humItem.value?.toFixed(1) || "--",
      pressure: pressItem.value?.toFixed(1) || "--",
      rain: rainItem.value?.toFixed(5) || "--",
    };
  });

  return combined.slice(0, 50);
});

const loadTemperatureData = async (period) => {
  chartLoading.value = true;
  try {
    const data = await meteoStore.fetchArchiveDataByPeriod(
      sondeId.value,
      period,
      "temperature",
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
      "humidity",
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
      "pressure",
    );
    pressureData.value = data;
  } catch (err) {
    console.error("Erreur chargement pression:", err);
  } finally {
    chartLoading.value = false;
  }
};

const loadRainData = async (period) => {
  chartLoading.value = true;
  try {
    const data = await meteoStore.fetchArchiveDataByPeriod(
      sondeId.value,
      period,
      "rain",
    );
    rainData.value = data;
  } catch (err) {
    console.error("Erreur chargement précipitations:", err);
  } finally {
    chartLoading.value = false;
  }
};

const windMetrics = computed(() => {
  const metrics = [];

  if (measurements.value.wind_speed_avg?.value !== undefined) {
    metrics.push({
      label: "Moyenne",
      value: measurements.value.wind_speed_avg.value,
      unit: measurements.value.wind_speed_avg.unit || "Kts",
    });
  }

  if (measurements.value.wind_speed_max?.value !== undefined) {
    metrics.push({
      label: "Maximum",
      value: measurements.value.wind_speed_max.value,
      unit: measurements.value.wind_speed_max.unit || "Kts",
    });
  }

  if (measurements.value.wind_speed_min?.value !== undefined) {
    metrics.push({
      label: "Minimum",
      value: measurements.value.wind_speed_min.value,
      unit: measurements.value.wind_speed_min.unit || "Kts",
    });
  }

  return metrics;
});

const getWindDirection = (degrees) => {
  if (degrees === null || degrees === undefined) return "--";

  const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

const handleTemperaturePeriodChange = (period) => {
  selectedTempPeriod.value = period.value;
  loadTemperatureData(period);
};

const handleHumidityPeriodChange = (period) => {
  selectedHumidityPeriod.value = period.value;
  loadHumidityData(period);
};

const handlePressurePeriodChange = (period) => {
  selectedPressurePeriod.value = period.value;
  loadPressureData(period);
};

const handleRainPeriodChange = (period) => {
  selectedRainPeriod.value = period.value;
  loadRainData(period);
};

const loadStationData = async () => {
  try {
    if (meteoStore.sondes.length === 0) {
      await meteoStore.fetchAllSondes();
    }

    await Promise.all([
      loadTemperatureData(defaultPeriod),
      loadHumidityData(defaultPeriod),
      loadPressureData(defaultPeriod),
      loadRainData(defaultPeriod),
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

const formatTableTime = (dateString) => {
  if (!dateString) return "--";
  const date = new Date(dateString);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const exportData = () => {
  const csv = [
    [
      "Heure",
      "Température (°C)",
      "Humidité (%)",
      "Pression (hPa)",
      "Pluie (mm)",
    ],
    ...tableData.value.map((row) => [
      formatTableTime(row.time),
      row.temperature,
      row.humidity,
      row.pressure,
      row.rain,
    ]),
  ]
    .map((row) => row.join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `station-${sondeId.value}-${new Date().toISOString()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

const getHoursFromPeriod = (period) => {
  const map = { "1h": 1, "6h": 6, "12h": 12, "24h": 24, "7d": 168 };
  return map[period] || 24;
};

onMounted(async () => {
  await loadStationData();

  const currentStation = meteoStore.getSondeById(sondeId.value);

  if (!currentStation || currentStation.status === "offline") {
    console.log("Station offline ou introuvable");
    return;
  }

  const wsUrl = currentStation.server_url.replace("http://", "ws://");

  try {
    websocketService.connect(sondeId.value, wsUrl);
    wsConnected.value = true;

    unsubscribe = websocketService.subscribe(
      sondeId.value,
      "live-update",
      (data) => {
        console.log("WebSocket update:", data);
        meteoStore.updateSondeMeasurements(sondeId.value, data.data);
      },
    );
  } catch (err) {
    console.error("WebSocket error:", err);
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
        <v-btn color="primary" to="/" class="mt-4"> Retour à la carte </v-btn>
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
                <div class="text-caption" v-if="station.location">
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
                <v-icon
                  start
                  :icon="wsConnected ? 'mdi-wifi' : 'mdi-wifi-off'"
                ></v-icon>
                {{ wsConnected ? "Connecté" : "Hors ligne" }}
              </v-chip>
            </v-card-title>

            <v-card-subtitle class="pt-3">
              <v-icon start size="small">mdi-clock-outline</v-icon>
              Dernière mise à jour: {{ formatDate(station.date) }}
            </v-card-subtitle>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12" sm="6" md="4" lg="3">
          <SensorCard
            icon="mdi-thermometer"
            label="Température"
            :value="
              station.measurements?.temperature?.value?.toFixed(1) || '--'
            "
            :unit="station.measurements?.temperature?.unit || '°C'"
            color="#FF7675"
          />
        </v-col>

        <v-col cols="12" sm="6" md="4" lg="3">
          <SensorCard
            icon="mdi-water-percent"
            label="Humidité"
            :value="station.measurements?.humidity?.value?.toFixed(0) || '--'"
            :unit="station.measurements?.humidity?.unit || '%'"
            color="#74B9FF"
          />
        </v-col>

        <v-col cols="12" sm="6" md="4" lg="3">
          <SensorCard
            icon="mdi-gauge"
            label="Pression"
            :value="station.measurements?.pressure?.value?.toFixed(1) || '--'"
            :unit="station.measurements?.pressure?.unit || 'hPa'"
            color="#A29BFE"
          />
        </v-col>

        <v-col cols="12" sm="6" md="4" lg="3">
          <SensorCard
            icon="mdi-weather-rainy"
            label="Précipitations"
            :value="station.measurements?.rain?.value?.toFixed(1) || '--'"
            :unit="station.measurements?.rain?.unit || 'mm'"
            color="#0984E3"
          />
        </v-col>

        <v-col cols="12" sm="6" md="4" lg="3">
          <SensorCard
            icon="mdi-brightness-5"
            label="Luminosité"
            :value="station.measurements?.luminosity?.value?.toFixed(0) || '--'"
            :unit="station.measurements?.luminosity?.unit || 'Lux'"
            color="#FFA502"
          />
        </v-col>

        <v-col cols="12" sm="6" md="4" lg="3">
          <SensorCard
            icon="mdi-compass"
            label="Direction du vent"
            :value="getWindDirection(measurements.wind_heading?.value)"
            :unit="
              measurements.wind_heading?.value
                ? `${measurements.wind_heading.value.toFixed(0)}°`
                : ''
            "
            color="#FDCB6E"
          />
        </v-col>

        <v-col cols="12" sm="12" md="8" lg="6">
          <SensorCard
            icon="mdi-weather-windy"
            label="Statistiques du vent"
            :value="measurements.wind_speed_avg?.value?.toFixed(1) ?? '--'"
            :unit="measurements.wind_speed_avg?.unit ?? 'Kts'"
            color="#55EFC4"
            :additional-metrics="windMetrics"
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
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon start color="primary">mdi-table</v-icon>
              Historique des données
              <v-spacer></v-spacer>
              <v-btn
                icon="mdi-download"
                variant="text"
                size="small"
                @click="exportData"
                title="Exporter en CSV"
              ></v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-data-table
              :headers="tableHeaders"
              :items="tableData"
              :loading="chartLoading"
              :items-per-page="10"
              class="elevation-0"
            >
              <template v-slot:item.time="{ item }">
                {{ formatTableTime(item.time) }}
              </template>
              <template v-slot:item.temperature="{ item }">
                <v-chip size="small" color="#FF7675" variant="flat">
                  {{ item.temperature }}°C
                </v-chip>
              </template>
              <template v-slot:item.humidity="{ item }">
                <v-chip size="small" color="#74B9FF" variant="flat">
                  {{ item.humidity }}%
                </v-chip>
              </template>
              <template v-slot:item.pressure="{ item }">
                <v-chip size="small" color="#A29BFE" variant="flat">
                  {{ item.pressure }} hPa
                </v-chip>
              </template>
              <template v-slot:item.rain="{ item }">
                <v-chip size="small" color="#0984E3" variant="flat">
                  {{ item.rain }} mm
                </v-chip>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>

      <v-row v-if="!meteoStore.loading && station" class="mt-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon start color="primary">mdi-chart-line</v-icon>
              Évolution des mesures
            </v-card-title>
            <v-divider></v-divider>

            <v-tabs
              v-model="activeChartTab"
              bg-color="transparent"
              color="primary"
              grow
            >
              <v-tab value="temp">
                <v-icon start>mdi-thermometer</v-icon>
                Température
              </v-tab>
              <v-tab value="humidity">
                <v-icon start>mdi-water-percent</v-icon>
                Humidité
              </v-tab>
              <v-tab value="pressure">
                <v-icon start>mdi-gauge</v-icon>
                Pression
              </v-tab>
              <v-tab value="rain">
                <v-icon start>mdi-weather-rainy</v-icon>
                Pluie
              </v-tab>
            </v-tabs>

            <v-card-text class="pa-4">
              <v-window v-model="activeChartTab">
                <v-window-item value="temp">
                  <ChartWidget
                    title="Évolution de la température"
                    :data="temperatureData"
                    :loading="chartLoading"
                    color="#FF7675"
                    unit="°C"
                    @period-change="handleTemperaturePeriodChange"
                  />
                </v-window-item>

                <v-window-item value="humidity">
                  <ChartWidget
                    title="Évolution de l'humidité"
                    :data="humidityData"
                    :loading="chartLoading"
                    color="#74B9FF"
                    unit="%"
                    @period-change="handleHumidityPeriodChange"
                  />
                </v-window-item>

                <v-window-item value="pressure">
                  <ChartWidget
                    title="Évolution de la pression"
                    :data="pressureData"
                    :loading="chartLoading"
                    color="#A29BFE"
                    unit="hPa"
                    @period-change="handlePressurePeriodChange"
                  />
                </v-window-item>

                <v-window-item value="rain">
                  <ChartWidget
                    title="Évolution des précipitations"
                    :data="rainData"
                    :loading="chartLoading"
                    color="#0984E3"
                    unit="mm"
                    @period-change="handleRainPeriodChange"
                  />
                </v-window-item>
              </v-window>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>
