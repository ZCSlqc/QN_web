import { onMounted, onUnmounted } from 'vue'

export function usePetals(canvasRef) {
  let frame = 0
  let observer
  let visible = false
  let canvas, context, petals
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  function resize() {
    if (!canvas) return
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
  }
  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    for (const p of petals) {
      p.y += p.speed; p.phase += 0.015; p.x += Math.sin(p.phase) * 0.4
      if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width }
      context.fillStyle = 'rgba(240,185,195,0.4)'
      context.beginPath()
      context.ellipse(p.x, p.y, p.radius, p.radius * 0.6, p.phase, 0, Math.PI * 2)
      context.fill()
    }
    frame = requestAnimationFrame(draw)
  }
  function sync() {
    cancelAnimationFrame(frame)
    if (visible && !document.hidden && !preference.matches && context) frame = requestAnimationFrame(draw)
    else if (preference.matches && context) context.clearRect(0, 0, canvas.width, canvas.height)
  }
  onMounted(() => {
    canvas = canvasRef.value
    context = canvas?.getContext('2d')
    if (!context) return
    resize()
    petals = Array.from({ length: window.innerWidth < 768 ? 12 : 24 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      radius: 4 + Math.random() * 7, speed: 0.5 + Math.random(), phase: Math.random() * 6,
    }))
    observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    observer.observe(canvas)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', sync)
    preference.addEventListener('change', sync)
  })
  onUnmounted(() => {
    cancelAnimationFrame(frame)
    observer?.disconnect()
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', sync)
    preference.removeEventListener('change', sync)
  })
}
