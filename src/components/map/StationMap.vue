<script setup>
import { ref, onMounted } from "vue";
import { useMeteoStore } from "@/stores/meteo";
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

let map = null;
let vectorSource = null;

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
      center: fromLonLat([2.5875, 48.8417]),
      zoom: 15,
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
          radius: 12,
          fill: new Fill({ color: getTemperatureColor(temperature) }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
        text: new Text({
          text: `${temperature.toFixed(1)}°`,
          font: "bold 11px sans-serif",
          fill: new Fill({ color: "#fff" }),
          offsetY: 0,
        }),
      }),
    );

    vectorSource.addFeature(marker);
  });
};

const getTemperatureColor = (temp) => {
  if (temp < 10) return "#74B9FF";
  if (temp < 15) return "#A29BFE";
  if (temp < 20) return "#FDCB6E";
  if (temp < 25) return "#FFA726";
  return "#FF7675";
};

onMounted(async () => {
  initMap();
  await loadSondes();
});
</script>

<template>
  <v-card class="map-container">
    <v-card-title class="d-flex align-center">
      <v-icon start color="primary">mdi-map-marker-multiple</v-icon>
      Carte des Sondes Météo
      <v-spacer></v-spacer>
      <v-chip color="success" size="small">
        {{ meteoStore.activeSondesCount }} sondes actives
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
