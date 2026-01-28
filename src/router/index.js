import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'map',
      component: () => import('../views/MapView.vue')
    },
    {
      path: '/station/:id',
      name: 'station',
      component: () => import('../views/StationView.vue')
    },
    {
      path: '/comparison',
      name: 'comparison',
      component: () => import('../views/ComparisonView.vue')
    }
  ]
})

export default router