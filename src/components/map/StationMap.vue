<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useMeteoStore } from "@/stores/meteo";
import websocketService from "@/services/websocket.service";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Style, Circle, Fill, Stroke, Text } from "ol/style";
import "ol/ol.css";

const meteoStore = useMeteoStore();

const selectedStation = ref(null);
const showStationDialog = ref(false);
const wsConnected = ref(false);
const lastUpdateTime = ref(null);

let map = null;
let vectorSource = null;
let unsubscribe = null;

const loadSondes = async () => {
  try {
    await meteoStore.fetchAllSondes();
    addMarkers();
  } catch (error) {
    console.error("Erreur chargement sondes:", error);
  }
};

const initMap = () => {
  vectorSource = new VectorSource();

  map = new Map({
    target: "map",
    layers: [
      new TileLayer({
        source: new OSM(),
      }),
      new VectorLayer({
        source: vectorSource,
      }),
    ],
    view: new View({
      center: fromLonLat([-0.1277583, 51.5073509]),
      zoom: 10,
    }),
  });

  map.on("click", (event) => {
    map.forEachFeatureAtPixel(event.pixel, (feature) => {
      const sondeId = feature.get("sondeId");
      const sonde = meteoStore.getSondeById(sondeId);
      if (sonde) {
        selectedStation.value = sonde;
        showStationDialog.value = true;
      }
    });
  });

  map.on("pointermove", (event) => {
    const hit = map.hasFeatureAtPixel(event.pixel);
    map.getTargetElement().style.cursor = hit ? "pointer" : "";
  });
};

const addMarkers = () => {
  if (!vectorSource) return;
  vectorSource.clear();
  meteoStore.sondes.forEach((sonde) => {
    const temperature = sonde.measurements?.temperature?.value || 0;
    const marker = new Feature({
      geometry: new Point(
        fromLonLat([sonde.location.long, sonde.location.lat]),
      ),
      sondeId: sonde.sonde_id,
    });
    marker.setStyle(
      new Style({
        image: new Circle({
          radius: 20,
          fill: new Fill({ color: getTemperatureColor(temperature) }),
          stroke: new Stroke({ 
            color: "#ffffff", 
            width: 4 
          }),
        }),
        text: new Text({
          text: `${temperature.toFixed(1)}°`,
          font: "bold 14px system-ui",
          fill: new Fill({ color: "#ffffff" }),
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 0.5)",
            width: 4
          }),
          offsetY: 1,
        }),
      }), 
    );
    vectorSource.addFeature(marker);
  });
};


const createMarkerIcon = (temperature) => {
  const color = getTemperatureColor(temperature);
  
  const svg = `
    <svg width="40" height="50" xmlns="http://www.w3.org/2000/svg">
      <!-- Shadow -->
      <ellipse cx="20" cy="47" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
      
      <!-- Pin shape -->
      <path d="M 20 5 C 12 5 6 11 6 19 C 6 28 20 45 20 45 C 20 45 34 28 34 19 C 34 11 28 5 20 5 Z" 
            fill="${color}" 
            stroke="white" 
            stroke-width="2.5"/>
      
      <!-- Inner circle -->
      <circle cx="20" cy="19" r="8" fill="white" opacity="0.3"/>
      
      <!-- Temperature text -->
      <text x="20" y="23" 
            font-family="system-ui, sans-serif" 
            font-size="11" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle">${temperature.toFixed(1)}°</text>
    </svg>
  `;
  
  return new Icon({
    src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
    anchor: [0.5, 1],
    scale: 1,
  });
};

const getTemperatureColor = (temp) => {
  if (temp < 10) return "#74B9FF";
  if (temp < 15) return "#A29BFE";
  if (temp < 20) return "#FDCB6E";
  if (temp < 25) return "#FFA726";
  return "#FF7675";
};

watch(lastUpdateTime, () => {
  if (lastUpdateTime.value) {
    console.log("Mise à jour de la carte");
    addMarkers();
  }
});

onMounted(async () => {
  initMap();
  await loadSondes(); 
  
  if (meteoStore.sondes.length > 0) {
    const firstSondeId = meteoStore.sondes[0].sonde_id;
    const wsUrl = "ws://localhost:3000";
    
    try {
      websocketService.connect(firstSondeId, wsUrl);
      wsConnected.value = true;
      
      unsubscribe = websocketService.subscribe(
        firstSondeId,
        "live-update",
        (data) => {
          console.log("WebSocket carte:", data);
          meteoStore.updateSondeMeasurements(firstSondeId, data.data);
          lastUpdateTime.value = Date.now();
        }
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
  if (meteoStore.sondes.length > 0) {
    websocketService.disconnect(meteoStore.sondes[0].sonde_id);
  }
});
</script>

<template>
  <v-card class="map-container">
    <v-card-title class="d-flex align-center">
      <v-icon start color="primary">mdi-map-marker-multiple</v-icon>
      Carte des Sondes Météo
      <v-spacer></v-spacer>
      <v-chip 
        :color="wsConnected ? 'success' : 'grey'" 
        size="small"
      >
        <v-icon start :icon="wsConnected ? 'mdi-wifi' : 'mdi-wifi-off'"></v-icon>
        {{ meteoStore.activeSondesCount }} sondes
      </v-chip>
    </v-card-title>

    <v-card-text class="pa-0">
      <div id="map" ref="mapContainer" style="height: 600px"></div>
    </v-card-text>

    <v-dialog v-model="showStationDialog" max-width="500">
      <v-card v-if="selectedStation">
        <v-card-title class="bg-primary">
          <v-icon start>mdi-map-marker</v-icon>
          {{ selectedStation.name }}
        </v-card-title>

        <v-card-text class="pt-4">
          <v-list>
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="temperature">mdi-thermometer</v-icon>
              </template>
              <v-list-item-title>
                {{ selectedStation.measurements?.temperature?.value?.toFixed(2) }}°C
              </v-list-item-title>
              <v-list-item-subtitle>Température</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="humidity">mdi-water-percent</v-icon>
              </template>
              <v-list-item-title>
                {{ selectedStation.measurements?.humidity?.value?.toFixed(1) }}%
              </v-list-item-title>
              <v-list-item-subtitle>Humidité</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="wind">mdi-weather-windy</v-icon>
              </template>
              <v-list-item-title>
                {{ selectedStation.measurements?.wind_speed_avg?.value?.toFixed(1) }} km/h
              </v-list-item-title>
              <v-list-item-subtitle>Vent</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="text"
            @click="showStationDialog = false"
          >
            Fermer
          </v-btn>
          <v-btn color="primary" :to="`/station/${selectedStation.sonde_id}`">
            Voir le détail
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.map-container {
  height: 100%;
}

#map {
  width: 100%;
}
</style>