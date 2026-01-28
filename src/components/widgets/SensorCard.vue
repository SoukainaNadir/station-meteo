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