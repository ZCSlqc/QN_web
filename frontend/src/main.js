import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import 'element-plus/es/components/image-viewer/style/css'
import 'element-plus/es/components/dialog/style/css'

import './assets/css/theme.css'
import './assets/css/fonts.css'

const app = createApp(App)

app.use(router)
app.mount('#app')
