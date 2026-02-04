<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    @click="rail = false"
  >
    <v-list-item
      :prepend-avatar="require('@/assets/logo.svg')"
      title="Station Météo"
      nav
    >
      <template v-slot:append>
        <v-btn
          icon="mdi-chevron-left"
          variant="text"
          @click.stop="rail = !rail"
        ></v-btn>
      </template>
    </v-list-item>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <v-list-item
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        :value="item.value"
        rounded="xl"
      ></v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { ref } from 'vue'

const drawer = ref(true)
const rail = ref(false)

const navItems = [
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
    title: 'Historique',
    icon: 'mdi-chart-line',
    to: '/history',
    value: 'history'
  },
  {
    title: 'Comparaison',
    icon: 'mdi-compare',
    to: '/comparison',
    value: 'comparison'
  }
]
</script>

<style scoped>
.v-navigation-drawer {
  border-right: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>