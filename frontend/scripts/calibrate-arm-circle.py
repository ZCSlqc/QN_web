"""Two contour-tangent joint circles whose cut diameters lie on one line."""
import json
import math
from pathlib import Path

def point(curve,t):
    p,c,e=curve
    return tuple((1-t)**2*p[i]+2*(1-t)*t*c[i]+t*t*e[i] for i in range(2))

def nearest(curves,p):
    results=[]
    for curve in curves:
        lo,hi=0,1
        for _ in range(70):
            a=lo+(hi-lo)/3;b=hi-(hi-lo)/3
            if math.dist(point(curve,a),p)<math.dist(point(curve,b),p):hi=b
            else:lo=a
        q=point(curve,(lo+hi)/2)
        results.append((math.dist(q,p),q))
    return min(results)

outer=[((133.2,63.8),(156.9,67.2),(173.1,80.9)),((173.1,80.9),(181.55,88.1),(188,98.15))]
inner=[((177.05,108.75),(166.9,93.9),(148.8,89.5)),((148.8,89.5),(143.5,88.15),(137.55,87.8))]
x=131.51982+108/3;lo,hi=75,105
for _ in range(70):
    y=(lo+hi)/2
    if nearest(outer,(x,y))[0]>nearest(inner,(x,y))[0]:hi=y
    else:lo=y
p=(x,(lo+hi)/2)
def native(q):return {'x':(q[0]-131.51982)*3,'y':(q[1]-63.8)*3}
a,b=nearest(outer,p),nearest(inner,p)
assert abs(a[0]-b[0])<1e-9
contacts=[native(a[1]),native(b[1])]
station=native(p)
cut=math.atan2(contacts[0]['x']-contacts[1]['x'],contacts[1]['y']-contacts[0]['y'])
normal=(math.cos(cut),math.sin(cut))
offset=json.loads(Path(__file__).resolve().parents[1].joinpath('src/features/wedding/armAttachment.json').read_text())
dx=offset['sleeveTop']['x']-offset['armTop']['x']
dy=offset['sleeveTop']['y']-offset['armTop']['y']
def sleeve_native(q):return {'x':(q[0]-278.07663)*3-dx,'y':(q[1]-25.35)*3-dy}
sc=[((282.9,25.8),(311.65,30.95),(327.65,49.5)),((317.65,67.15),(306.25,54.05),(285.75,52.7))]

def intersection(curve):
    def distance(t):
        q=sleeve_native(point(curve,t))
        return (q['x']-station['x'])*normal[0]+(q['y']-station['y'])*normal[1]
    lo,hi=0,1
    assert distance(lo)*distance(hi)<0
    for _ in range(70):
        middle=(lo+hi)/2
        if distance(lo)*distance(middle)<=0:hi=middle
        else:lo=middle
    return sleeve_native(point(curve,(lo+hi)/2))

# The skin's medial circle defines the cut line. Slide the sleeve center
# ALONG that line until its distances to both sleeve contours are equal.
# Both circles are tangent to their own source contours; they are not concentric.
direction=(-normal[1],normal[0])
def sleeve_at(distance):
    center={k:station[k]+direction[i]*distance for i,k in enumerate(('x','y'))}
    source=(278.07663+(center['x']+dx)/3,25.35+(center['y']+dy)/3)
    return center,[nearest([curve],source) for curve in sc]
lo,hi=-20,20
assert (sleeve_at(lo)[1][0][0]-sleeve_at(lo)[1][1][0])*(sleeve_at(hi)[1][0][0]-sleeve_at(hi)[1][1][0])<0
for _ in range(75):
    middle=(lo+hi)/2
    _,distances=sleeve_at(middle)
    if distances[0][0]>distances[1][0]:hi=middle
    else:lo=middle
separation=(lo+hi)/2
sleeve_center,sleeve_nearest=sleeve_at(separation)
assert abs(sleeve_nearest[0][0]-sleeve_nearest[1][0])<1e-9
skin={**station,'radius':a[0]*3,'contacts':contacts}
sleeve={**sleeve_center,'radius':sleeve_nearest[0][0]*3,'contacts':[sleeve_native(q[1]) for q in sleeve_nearest]}
for circle in (skin,sleeve):
    circle['diameter']=[{k:circle[k]+side*circle['radius']*direction[i] for i,k in enumerate(('x','y'))} for side in (-1,1)]
assert sleeve['radius']>skin['radius']
assert sleeve['radius']>=skin['radius']+abs(separation)
result={**station,'radius':skin['radius'],'sleeveRadius':sleeve['radius'],'cut':math.degrees(cut),
        'skin':skin,'sleeve':sleeve,'diameterLine':{'point':station,'direction':{'x':direction[0],'y':direction[1]}},
        'centerSeparation':abs(separation),'cutEndpoints':skin['diameter'],
        'centerRule':'separate medial circles constrained to a common cut diameter line',
        'radiusRule':'equal shortest distance to both original contours for each circle'}
Path(__file__).resolve().parents[1].joinpath('src/features/wedding/armCircle.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
