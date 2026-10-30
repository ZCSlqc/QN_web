export function homeSectionHref(id) {
  return id === 'home' ? '/index' : `/index#${id}`
}

export function navigateHomeSection(router, id) {
  if (router.currentRoute.value.path !== '/index') return router.push(homeSectionHref(id))
  document.getElementById(id)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  })
}
