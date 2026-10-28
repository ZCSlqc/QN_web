import axios from 'axios'
import { announceFoodReward } from '../features/pet/rewardFeedback'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => { announceFoodReward(response); return response },
  (error) => {
    const activeToken = localStorage.getItem('token')
    if (error.response?.status === 401 && error.config?.headers?.Authorization === `Bearer ${activeToken}`) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      window.dispatchEvent(new Event('auth-expired'))
    }
    return Promise.reject(error)
  },
)

export default request
