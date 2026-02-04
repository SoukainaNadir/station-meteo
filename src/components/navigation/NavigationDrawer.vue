<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    color="white"
    width="280"
    @click="rail = false"
  >
    <div class="pa-4 d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-avatar color="primary" size="36">
          <v-icon color="white">mdi-weather-partly-cloudy</v-icon>
        </v-avatar>
        <span v-if="!rail" class="ml-3 text-h6 font-weight-medium">Station Météo</span>
      </div>
      <v-btn
        :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
        variant="text"
        size="small"
        @click.stop="rail = !rail"
      ></v-btn>
    </div>

    <v-divider></v-divider>

    <!-- Navigation principale -->
    <v-list density="comfortable" nav class="px-2">
      <v-list-item
        v-for="item in mainNavItems"
        :key="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        :value="item.value"
        rounded="lg"
        class="mb-1"
      ></v-list-item>
    </v-list>

    <v-divider class="my-3"></v-divider>

    <!-- Section Mes Sondes -->
    <div v-if="!rail" class="px-4 py-2">
      <span class="text-caption text-grey-darken-1 font-weight-bold">MES SONDES</span>
    </div>
    
    <v-list density="comfortable" nav class="px-2">
      <v-list-item
        v-for="sonde in meteoStore.sondes.slice(0, 5)"
        :key="sonde.sonde_id"
        :to="`/station/${sonde.sonde_id}`"
        :prepend-icon="'mdi-map-marker'"
        :title="sonde.name"
        rounded="lg"
        class="mb-1"
      >
        <template v-slot:append v-if="!rail">
          <v-chip 
            size="x-small" 
            :color="getStatusColor(sonde)"
            variant="flat"
            class="font-weight-bold"
          >
            {{ sonde.measurements?.temperature?.value?.toFixed(1) }}°
          </v-chip>
        </template>
      </v-list-item>

      <v-list-item
        v-if="meteoStore.sondes.length > 5 && !rail"
        prepend-icon="mdi-dots-horizontal"
        title="Voir toutes les sondes"
        to="/map"
        rounded="lg"
        class="text-primary"
      ></v-list-item>
    </v-list>

    <!-- Bottom navigation -->
    <template v-slot:append>
      <v-divider></v-divider>
      <v-list density="comfortable" nav class="px-2">
        <v-list-item
          v-for="item in bottomNavItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          rounded="lg"
          class="mb-1"
        ></v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMeteoStore } from '@/stores/meteo'

const meteoStore = useMeteoStore()
const drawer = ref(true)
const rail = ref(false)

const mainNavItems = [
  {
    title: 'Dashboard',
    icon: 'mdi-view-dashboard',
    to: '/',
    value: 'dashboard'
  },
  {
    title: 'Carte des Sondes',
    icon: 'mdi-map-marker-multiple',
    to: '/map',
    value: 'map'
  },
  {
    title: 'Comparaison',
    icon: 'mdi-compare',
    to: '/comparison',
    value: 'comparison'
  }
]

const getStatusColor = (sonde) => {
  const temp = sonde.measurements?.temperature?.value || 0
  if (temp < 10) return 'blue'
  if (temp < 20) return 'green'
  if (temp < 25) return 'orange'
  return 'red'
}

onMounted(() => {
  if (meteoStore.sondes.length === 0) {
    meteoStore.fetchAllSondes()
  }
})
</script>

<style scoped>
.v-navigation-drawer {
  border-right: 1px solid #e0e0e0 !important;
}

.v-list-item--active {
  background: linear-gradient(90deg, rgba(103, 58, 183, 0.08) 0%, rgba(103, 58, 183, 0.04) 100%) !important;
  border-left: 3px solid #673AB7;
}

.v-list-item--active .v-list-item__prepend {
  color: #673AB7 !important;
}

.v-list-item:hover {
  background: rgba(0, 0, 0, 0.04);
}
</style>