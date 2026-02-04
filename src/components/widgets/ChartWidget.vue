<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center">
      <v-icon start color="primary">{{ icon }}</v-icon>
      {{ title }}

      <v-spacer></v-spacer>

      <v-chip-group
        v-model="selectedPeriod"
        mandatory
        @update:model-value="$emit('period-change', periods[selectedPeriod])"
      >
        <v-chip
          v-for="(period, index) in periods"
          :key="index"
          size="small"
          :value="index"
        >
          {{ period.label }}
        </v-chip>
      </v-chip-group>
    </v-card-title>

    <v-card-text>
      <div v-if="loading" class="text-center py-8">
        <v-progress-circular
          indeterminate
          color="primary"
        ></v-progress-circular>
      </div>

      <div v-else-if="error" class="text-center py-8">
        <v-icon size="48" color="error">mdi-alert-circle</v-icon>
        <p class="text-error mt-2">{{ error }}</p>
      </div>

      <div v-else style="position: relative; height: 300px">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: "mdi-chart-line",
  },
  data: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
  color: {
    type: String,
    default: "#6C5CE7",
  },
  unit: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["period-change"]);

const selectedPeriod = ref(1);

const periods = [
  { label: "2h", value: "2h", hours: 2 },
  { label: "24h", value: "24h", hours: 24 },
  { label: "7j", value: "7d", hours: 168 },
  { label: "30j", value: "30d", hours: 720 },
];

const chartData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  return {
    labels: props.data.map((item) => formatTime(item.time)),
    datasets: [
      {
        label: props.title,
        data: props.data.map((item) => item.value),
        borderColor: props.color,
        backgroundColor: hexToRgba(props.color, 0.1),
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: props.color,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };
});

const chartOptions = computed(() => {
  const values = props.data.map((item) => item.value).filter((v) => v != null);

  if (values.length === 0) {
    return getDefaultOptions();
  }

  let min = Math.min(...values);
  let max = Math.max(...values);

  const range = max - min;
  const padding = range > 0 ? range * 0.1 : 1;

  min = min - padding;
  max = max + padding;

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: {
          size: 13,
        },
        bodyFont: {
          size: 14,
        },
        callbacks: {
          label: (context) => {
            return `${context.parsed.y.toFixed(2)} ${props.unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      y: {
        min: min,
        max: max,
        beginAtZero: false,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          callback: (value) => `${value.toFixed(2)} ${props.unit}`,
        },
      },
    },
  };
});

const getDefaultOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "index",
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      padding: 12,
      titleFont: {
        size: 13,
      },
      bodyFont: {
        size: 14,
      },
      callbacks: {
        label: (context) => {
          return `${context.parsed.y.toFixed(1)} ${props.unit}`;
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 8,
      },
    },
    y: {
      beginAtZero: false,
      grid: {
        color: "rgba(0, 0, 0, 0.05)",
      },
      ticks: {
        callback: (value) => `${value} ${props.unit}`,
      },
    },
  },
});

const formatTime = (timeString) => {
  const date = new Date(timeString);
  const period = periods[selectedPeriod.value];

  if (period.hours <= 24) {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    });
  }
};

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
</script>
