const TARGETS = [
  'https://manage.worker-bee.app/api/ping',
]

export default {
  async scheduled(_event, _env, ctx) {
    ctx.waitUntil(
      Promise.all(
        TARGETS.map(url =>
          fetch(url, { method: 'GET', headers: { 'x-ping': 'cf-keepalive' } })
            .then(r => console.log(`ping ${url} → ${r.status}`))
            .catch(e => console.error(`ping failed ${url}: ${e.message}`))
        )
      )
    )
  },
}
