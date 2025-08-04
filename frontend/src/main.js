import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'

import App from './App.vue'
import Dashboard from './views/Dashboard.vue'
import DataDiagram from './views/DataDiagram.vue'
import DataView from './views/DataView.vue'
import Groups from './views/Groups.vue'
import Domains from './views/Domains.vue'
import Settings from './views/Settings.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: Dashboard },
  { path: '/diagram', name: 'DataDiagram', component: DataDiagram },
  { path: '/data', name: 'DataView', component: DataView },
  { path: '/groups', name: 'Groups', component: Groups },
  { path: '/domains', name: 'Domains', component: Domains },
  { path: '/settings', name: 'Settings', component: Settings }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app')