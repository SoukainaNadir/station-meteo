<template>
  <v-container fluid class="dashboard-container">
    <v-row>
      <v-col cols="12">
        <div class="header-card">
          <div class="header-content">
            <div>
              <h1 class="text-h3 font-weight-bold text-white mb-2">
                Station Météo
              </h1>
              <p class="text-subtitle-1 text-white opacity-90">
                Surveillance en temps réel de vos stations météorologiques
              </p>
            </div>
            <v-btn
              icon
              size="large"
              variant="elevated"
              color="white"
              @click="refreshData"
              :loading="meteoStore.loading"
            >
              <v-icon color="primary">mdi-refresh</v-icon>
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="8">
        <v-card elevation="3" class="station-map-card">
          <v-card-title class="d-flex align-center pa-4">
            <v-icon color="primary" class="mr-2">mdi-map-marker-radius</v-icon>
            <span class="text-h6">Carte des stations</span>
            <v-spacer></v-spacer>
            <v-chip color="success" size="small" variant="flat">
              {{ meteoStore.sondes.length }} station(s) active(s)
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <div id="map" style="height: 350px; width: 100%"></div>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card elevation="3" class="station-selector-card">
          <v-card-title class="pa-4">
            <v-icon color="primary" class="mr-2">mdi-tune</v-icon>
            <span class="text-h6">Configuration</span>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-4">
            <v-select
              v-model="selectedStationId"
              :items="stationOptions"
              label="Station active"
              item-title="name"
              item-value="id"
              prepend-inner-icon="mdi-map-marker"
              variant="outlined"
              density="comfortable"
              color="primary"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props" :title="item.raw.name">
                  <template v-slot:prepend>
                    <v-avatar size="40" :color="getStationColor(item.raw.temp)">
                      <span class="text-white font-weight-bold">
                        {{ item.raw.temp }}°
                      </span>
                    </v-avatar>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <div
              v-if="selectedStation"
              class="station-info mt-4 pa-3 bg-grey-lighten-5 rounded"
            >
              <div class="d-flex align-center mb-2">
                <v-icon size="small" class="mr-2" color="grey-darken-1"
                  >mdi-map-marker</v-icon
                >
                <span class="text-caption text-grey-darken-2">
                  {{ selectedStation.location.lat.toFixed(4) }}°N,
                  {{ selectedStation.location.long.toFixed(4) }}°E
                </span>
              </div>
              <div class="d-flex align-center">
                <v-icon size="small" class="mr-2" color="grey-darken-1"
                  >mdi-clock-outline</v-icon
                >
                <span class="text-caption text-grey-darken-2">
                  {{ formatDate(selectedStation.date) }}
                </span>
              </div>
            </div>

            <v-divider class="my-4"></v-divider>

            <div class="quick-stats">
              <div class="stat-item">
                <v-icon color="success" size="small">mdi-check-circle</v-icon>
                <span class="text-caption ml-2">Données à jour</span>
              </div>
              <div class="stat-item mt-2">
                <v-icon color="primary" size="small">mdi-database</v-icon>
                <span class="text-caption ml-2">1 capteur actif</span>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="meteoStore.loading && !selectedStation">
      <v-col cols="12" class="text-center py-12">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-4 text-grey-darken-1">Chargement des données...</p>
      </v-col>
    </v-row>

    <v-alert v-if="meteoStore.error" type="error" variant="tonal" class="mt-4">
      {{ meteoStore.error }}
    </v-alert>

    <v-row v-if="!meteoStore.loading && selectedStation" class="mt-4">
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4">
          <v-icon color="primary" class="mr-2">mdi-gauge</v-icon>
          Données en temps réel
        </h2>
      </v-col>
    </v-row>

    <v-row v-if="!meteoStore.loading && selectedStation" class="mt-6">
      <v-col cols="12">
        <v-card elevation="3">
          <v-card-title class="pa-4">
            <v-icon color="primary" class="mr-2">mdi-chart-line</v-icon>
            <span class="text-h6">Historique des mesures</span>
          </v-card-title>
          <v-divider></v-divider>

          <v-tabs
            v-model="activeTab"
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
            <v-window v-model="activeTab">
              <v-window-item value="temp">
                <ChartWidget
                  title="Évolution de la température"
                  :data="temperatureData"
                  color="#FF6B6B"
                  unit="°C"
                  @period-change="handleTemperaturePeriodChange"
                />
              </v-window-item>

              <v-window-item value="humidity">
                <ChartWidget
                  title="Évolution de l'humidité"
                  :data="humidityData"
                  color="#4ECDC4"
                  unit="%"
                  @period-change="handleHumidityPeriodChange"
                />
              </v-window-item>

              <v-window-item value="pressure">
                <ChartWidget
                  title="Évolution de la pression"
                  :data="pressureData"
                  color="#A29BFE"
                  unit="hPa"
                  @period-change="handlePressurePeriodChange"
                />
              </v-window-item>

              <v-window-item value="rain">
                <ChartWidget
                  title="Évolution des précipitations"
                  :data="rainData"
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

    <v-dialog v-model="showStationDialog" max-width="500">
      <v-card v-if="selectedMapStation">
        <v-card-title class="bg-primary text-white">
          <v-icon start color="white">mdi-map-marker</v-icon>
          {{ selectedMapStation.name }}
        </v-card-title>

        <v-card-text class="pt-4">
          <v-list>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="#FF6B6B">mdi-thermometer</v-icon>
              </template>
              <v-list-item-title>
                {{
                  selectedMapStation.measurements?.temperature?.value?.toFixed(
                    2,
                  )
                }}°C
              </v-list-item-title>
              <v-list-item-subtitle>Température</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="#4ECDC4">mdi-water-percent</v-icon>
              </template>
              <v-list-item-title>
                {{
                  selectedMapStation.measurements?.humidity?.value?.toFixed(1)
                }}%
              </v-list-item-title>
              <v-list-item-subtitle>Humidité</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="#A29BFE">mdi-gauge</v-icon>
              </template>
              <v-list-item-title>
                {{
                  selectedMapStation.measurements?.pressure?.value?.toFixed(1)
                }}
                hPa
              </v-list-item-title>
              <v-list-item-subtitle>Pression</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="#55EFC4">mdi-weather-windy</v-icon>
              </template>
              <v-list-item-title>
                {{
                  selectedMapStation.measurements?.wind_speed_avg?.value?.toFixed(
                    1,
                  )
                }}
                Kts
              </v-list-item-title>
              <v-list-item-subtitle>Vent moyen</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="#0984E3">mdi-weather-rainy</v-icon>
              </template>
              <v-list-item-title>
                {{
                  selectedMapStation.measurements?.rain?.value?.toFixed(1)
                }}
                mm
              </v-list-item-title>
              <v-list-item-subtitle>Précipitations</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey-darken-1"
            variant="text"
            @click="showStationDialog = false"
          >
            Fermer
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            :to="`/station/${selectedMapStation.sonde_id}`"
          >
            <v-icon start>mdi-chart-line</v-icon>
            Voir les détails
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useMeteoStore } from '@/stores/meteo'
import ChartWidget from '@/components/widgets/ChartWidget.vue'
import websocketService from '@/services/websocket.service'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import { Style, Circle, Fill, Stroke, Text } from 'ol/style'
import 'ol/ol.css'

const meteoStore = useMeteoStore();

const selectedStationId = ref(null);
const selectedMapStation = ref(null);
const showStationDialog = ref(false);
const temperatureData = ref([]);
const humidityData = ref([]);
const pressureData = ref([]);
const rainData = ref([]);
const activeTab = ref("temp");

let map = null;
let vectorSource = null;

const wsConnected = ref(false);
const lastUpdateTime = ref(null);
let unsubscribe = null;

const stationOptions = computed(() => {
  return meteoStore.sondes.map((sonde) => ({
    id: sonde.sonde_id,
    name: sonde.name,
    temp: sonde.measurements?.temperature?.value?.toFixed(1) || "--",
  }));
});

const selectedStation = computed(() => {
  if (!selectedStationId.value) return null;
  return meteoStore.getSondeById(selectedStationId.value);
});

const windMetrics = computed(() => {
  if (!selectedStation.value?.measurements) return [];
  const m = selectedStation.value.measurements;
  const metrics = [];

  if (m.wind_speed_avg?.value !== undefined) {
    metrics.push({
      label: "Moyenne",
      value: m.wind_speed_avg.value.toFixed(1),
      unit: m.wind_speed_avg.unit || "Kts",
    });
  }
  if (m.wind_speed_max?.value !== undefined) {
    metrics.push({
      label: "Maximum",
      value: m.wind_speed_max.value.toFixed(1),
      unit: m.wind_speed_max.unit || "Kts",
    });
  }
  if (m.wind_speed_min?.value !== undefined) {
    metrics.push({
      label: "Minimum",
      value: m.wind_speed_min.value.toFixed(1),
      unit: m.wind_speed_min.unit || "Kts",
    });
  }

  return metrics;
});

const getWindDirection = (degrees) => {
  if (degrees === null || degrees === undefined) return "--";
  const directions = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return directions[Math.round(degrees / 45) % 8];
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

const getStationColor = (temp) => {
  const t = parseFloat(temp);
  if (t < 0) return "#4ECDC4";
  if (t < 10) return "#6FE4DC";
  if (t < 20) return "#FFA502";
  if (t < 30) return "#FF8E8E";
  return "#FF6B6B";
};

const getTemperatureColor = (temp) => {
  if (temp < 0) return "#4ECDC4";
  if (temp < 10) return "#6FE4DC";
  if (temp < 20) return "#FDCB6E";
  if (temp < 30) return "#FFA502";
  return "#FF6B6B";
};

const initMap = () => {
  if (map) {
    map.setTarget(null);
    map = null;
  }

  vectorSource = new VectorSource();

  meteoStore.sondes.forEach((sonde) => {
    const temp = sonde.measurements?.temperature?.value || 15;
    const feature = new Feature({
      geometry: new Point(
        fromLonLat([sonde.location.long, sonde.location.lat]),
      ),
      name: sonde.name,
      id: sonde.sonde_id,
      temperature: temp,
    });

    feature.setStyle(
      new Style({
        image: new Circle({
          radius: 16,
          fill: new Fill({ color: getTemperatureColor(temp) }),
          stroke: new Stroke({ color: "#fff", width: 3 }),
        }),
        text: new Text({
          text: `${temp.toFixed(1)}°`,
          font: "bold 13px sans-serif",
          fill: new Fill({ color: "#fff" }),
          offsetY: 0,
        }),
      }),
    );

    vectorSource.addFeature(feature);
  });

  const centerLon =
    meteoStore.sondes.reduce((sum, s) => sum + s.location.long, 0) /
    meteoStore.sondes.length;
  const centerLat =
    meteoStore.sondes.reduce((sum, s) => sum + s.location.lat, 0) /
    meteoStore.sondes.length;

  map = new Map({
    target: "map",
    layers: [
      new TileLayer({ source: new OSM() }),
      new VectorLayer({ source: vectorSource }),
    ],
    view: new View({
      center: fromLonLat([centerLon, centerLat]),
      zoom: 14,
    }),
  });

  map.on("click", (evt) => {
    map.forEachFeatureAtPixel(evt.pixel, (feature) => {
      const stationId = feature.get("id");
      const station = meteoStore.getSondeById(stationId);
      if (station) {
        selectedMapStation.value = station;
        showStationDialog.value = true;
      }
    });
  });

  map.on("pointermove", (evt) => {
    const hit = map.hasFeatureAtPixel(evt.pixel);
    map.getTargetElement().style.cursor = hit ? "pointer" : "";
  });
};

const loadChartData = async (period = { value: "24h", hours: 24 }) => {
  if (!selectedStationId.value) return;

  try {
    const [temp, hum, press, rain] = await Promise.all([
      meteoStore.fetchArchiveDataByPeriod(
        selectedStationId.value,
        period,
        "temperature",
      ),
      meteoStore.fetchArchiveDataByPeriod(
        selectedStationId.value,
        period,
        "humidity",
      ),
      meteoStore.fetchArchiveDataByPeriod(
        selectedStationId.value,
        period,
        "pressure",
      ),
      meteoStore.fetchArchiveDataByPeriod(
        selectedStationId.value,
        period,
        "rain",
      ),
    ]);

    temperatureData.value = temp;
    humidityData.value = hum;
    pressureData.value = press;
    rainData.value = rain;
  } catch (err) {
    console.error("Erreur:", err);
  }
};

const handleTemperaturePeriodChange = (period) => {
  meteoStore
    .fetchArchiveDataByPeriod(selectedStationId.value, period, "temperature")
    .then((data) => (temperatureData.value = data));
};

const handleHumidityPeriodChange = (period) => {
  meteoStore
    .fetchArchiveDataByPeriod(selectedStationId.value, period, "humidity")
    .then((data) => (humidityData.value = data));
};

const handlePressurePeriodChange = (period) => {
  meteoStore
    .fetchArchiveDataByPeriod(selectedStationId.value, period, "pressure")
    .then((data) => (pressureData.value = data));
};

const handleRainPeriodChange = (period) => {
  meteoStore
    .fetchArchiveDataByPeriod(selectedStationId.value, period, "rain")
    .then((data) => (rainData.value = data));
};

const refreshData = async () => {
  await meteoStore.fetchAllSondes();
  if (selectedStationId.value) {
    loadChartData();
  }
};

watch(lastUpdateTime, async () => {
  if (!lastUpdateTime.value || !selectedStationId.value) return;

  console.log("Rechargement des graphiques suite à WebSocket...");

  await loadChartData({
    value: activeTab.value === "temp" ? "24h" : "24h",
    hours: 24,
  });

  if (map && vectorSource) {
    vectorSource.clear();
    meteoStore.sondes.forEach((sonde) => {
      const temp = sonde.measurements?.temperature?.value || 15;
      const feature = new Feature({
        geometry: new Point(
          fromLonLat([sonde.location.long, sonde.location.lat]),
        ),
        name: sonde.name,
        id: sonde.sonde_id,
        temperature: temp,
      });
      feature.setStyle(
        new Style({
          image: new Circle({
            radius: 16,
            fill: new Fill({ color: getTemperatureColor(temp) }),
            stroke: new Stroke({ color: "#fff", width: 3 }),
          }),
          text: new Text({
            text: `${temp.toFixed(1)}°`,
            font: "bold 13px sans-serif",
            fill: new Fill({ color: "#fff" }),
            offsetY: 0,
          }),
        }),
      );
      vectorSource.addFeature(feature);
    });
  }
});

onMounted(async () => {
  await meteoStore.fetchAllSondes();

  if (meteoStore.sondes.length > 0) {
    selectedStationId.value = meteoStore.sondes[0].sonde_id;
    await nextTick();
    initMap();
    loadChartData();

    const wsUrl = "ws://localhost:3000";
    try {
      websocketService.connect(selectedStationId.value, wsUrl);
      wsConnected.value = true;

      unsubscribe = websocketService.subscribe(
        selectedStationId.value,
        "live-update",
        (data) => {
          console.log("📡 WebSocket data:", data);
          meteoStore.updateSondeMeasurements(
            selectedStationId.value,
            data.data,
          );
          lastUpdateTime.value = Date.now();
        },
      );
    } catch (err) {
      console.error("WebSocket error:", err);
      wsConnected.value = false;
    }
  }
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
  if (selectedStationId.value) {
    websocketService.disconnect(selectedStationId.value);
  }
});

const getHoursFromPeriod = (period) => {
  const map = { "1h": 1, "6h": 6, "12h": 12, "24h": 24, "7d": 168 };
  return map[period] || 24;
};
</script>

<style scoped>
.dashboard-container {
  background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
  min-height: 100vh;
}

.header-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.station-map-card {
  border-radius: 16px;
  overflow: hidden;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.station-map-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.1);
}

.station-selector-card {
  border-radius: 16px;
  height: 100%;
}

.station-info {
  border-left: 3px solid #667eea;
}

.quick-stats .stat-item {
  display: flex;
  align-items: center;
}

#map {
  width: 100%;
}
</style>
