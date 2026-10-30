"""Generate the outer outline from existing province data.

Run from the project root: uv run --with shapely python frontend/scripts/build-map-outline.py
"""
import json
from pathlib import Path
from shapely.geometry import shape, mapping, MultiLineString
from shapely.ops import unary_union
from shapely import make_valid

root = Path(__file__).resolve().parents[2] / 'asset/journey/maps/china'
data = json.loads((root / 'province.geojson').read_text(encoding='utf-8'))
regions = [make_valid(shape(f['geometry'])) for f in data['features']]
merged = unary_union(regions)
polygons = list(merged.geoms) if merged.geom_type == 'MultiPolygon' else [merged]
# Only outer rings are outlined. Provincial shared edges are dissolved.
outline = MultiLineString([polygon.exterior.coords for polygon in polygons])
result = {'type': 'Feature', 'properties': {'name': '全国外轮廓'}, 'geometry': mapping(outline)}
(root / 'outline.geojson').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Generated outline from {len(regions)} existing regions; {len(polygons)} outer rings.')

output = Path(__file__).resolve().parents[1] / 'public/journey/maps/china/outline.geojson'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_bytes((root / 'outline.geojson').read_bytes())
