const { buildAssets } = require('./optimize-images.cjs')
buildAssets({ prefix: 'pets/liuyi/friends/' }).catch(error => { console.error(error); process.exitCode = 1 })
