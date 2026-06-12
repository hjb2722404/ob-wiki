import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../components/HomeView.vue')
  },
  {
    path: '/cluster/:clusterId',
    name: 'cluster',
    component: () => import('../components/ClusterView.vue')
  },
  {
    path: '/page/:id',
    name: 'page',
    component: () => import('../components/DetailView.vue'),
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
