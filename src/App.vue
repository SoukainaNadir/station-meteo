<template>
  <v-app>
    <NavigationDrawer />
    
    <v-app-bar color="primary" prominent>
      <v-app-bar-title class="text-h5 font-weight-medium">
        {{ currentPageTitle }}
      </v-app-bar-title>
      
      <v-spacer></v-spacer>
      
      <v-btn icon="mdi-bell-outline" variant="text"></v-btn>
      <v-btn icon="mdi-account-circle" variant="text"></v-btn>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useMeteoStore } from '@/stores/meteo'
import NavigationDrawer from '@/components/navigation/NavigationDrawer.vue'

const route = useRoute()
const meteoStore = useMeteoStore()

const pageTitles = {
  '/': 'Dashboard',
  '/map': 'Carte des Sondes',
  '/history': 'Historique',
  '/comparison': 'Comparaison',
  '/settings': 'Paramètres',
  '/help': 'Aide'
}

const currentPageTitle = computed(() => {
  if (route.path.startsWith('/station/')) {
    const sondeId = route.params.id
    const sonde = meteoStore.getSondeById(sondeId)
    return sonde ? `${sonde.name}` : 'Détails de la Station'
  }
  
  return pageTitles[route.path] || 'Station Météo Dashboard'
})
</script>

<style scoped>
.v-app-bar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}
</style>