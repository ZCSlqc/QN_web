import axios from 'axios'

const request = axios.create({
  baseURL: '',
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
  (response) => response.data,
  (error) => {
    console.error('请求出错：', error)
    return Promise.reject(error)
  },
)

export default request
