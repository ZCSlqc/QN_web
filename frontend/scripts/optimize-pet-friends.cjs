const { buildAssets } = require('./optimize-images.cjs')
buildAssets({ prefix: 'pet/liuyi/friends/' }).catch(error => { console.error(error); process.exitCode = 1 })
