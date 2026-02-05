<template>
  <v-card :color="color" class="sensor-card" elevation="2">
    <v-card-text class="pa-4">
      <div class="d-flex align-center mb-2">
        <v-icon :color="iconColor" size="32">{{ icon }}</v-icon>
        <span class="ml-2 text-subtitle-2 text-white">{{ label }}</span>
      </div>
      
      <div class="text-h3 font-weight-bold text-white">
        {{ value }}
      </div>
      <div class="text-caption text-white mt-1 opacity-80">
        {{ unit }}
      </div>
      
      <div v-if="additionalMetrics && additionalMetrics.length > 0" class="mt-3 pt-3" style="border-top: 1px solid rgba(255,255,255,0.2)">
        <div v-for="metric in additionalMetrics" :key="metric.label" class="d-flex justify-space-between align-center mb-1">
          <span class="text-caption text-white opacity-70">{{ metric.label }}</span>
          <span class="text-body-2 font-weight-medium text-white">{{ metric.value }} {{ metric.unit }}</span>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: 'primary'
  },
  iconColor: {
    type: String,
    default: 'white'
  },
  additionalMetrics: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.sensor-card {
  transition: transform 0.2s;
}

.sensor-card:hover {
  transform: translateY(-4px);
}
</style>