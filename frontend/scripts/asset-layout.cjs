// Source folders are grouped by page; deployed URLs remain stable for existing clients.
const path = require('node:path');
const layout = require('../../asset/source-layout.json');
const root = path.resolve(__dirname, '../..');
function sourcePath(value) {
  const p = value.replaceAll('\\', '/');
  if (p === 'wedding/props') return 'wedding/good';
  if (layout.files[p]) return layout.files[p];
  for (const [from, to] of Object.entries(layout.prefixes))
    if (p.startsWith(from)) return to + p.slice(from.length);
  if (p.startsWith('wedding/props/')) {
    const rest = p.slice('wedding/props/'.length);
    if (rest.startsWith('sources/')) {
      const food = ['food', 'drinks', 'desserts'].includes(rest.split('/')[1]);
      return `wedding/${food ? 'food' : 'good'}/${rest}`;
    }
    if (rest.startsWith('references/')) return `wedding/character/${rest}`;
    return `wedding/good/${rest}`;
  }
  return p;
}
const assetPath = (...parts) => path.join(root, 'asset', sourcePath(parts.join('/')));
module.exports = { sourcePath, assetPath };
