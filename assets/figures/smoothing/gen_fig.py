import math, random

# A density f made of peaks at the red dots (inside a blob), and its
# projection Pi_V f onto a line V, computed honestly: Pi_V f(t) is the
# integral of f along the fiber over t, done numerically. The green curve is
# drawn as a graph over V (height = Pi_V f), on the blob's side of the line.
W, H = 560, 330
TH = math.radians(-33)
u = (math.cos(TH), math.sin(TH))          # along V, toward upper right
m = (u[1], -u[0])                         # normal toward the blob (upper left)
Q = (300, 212)                            # a point on V; t measured from here

def at(t, s=0.0):
    return (Q[0] + u[0]*t + m[0]*s, Q[1] + u[1]*t + m[1]*s)

def coords(p):
    d = (p[0]-Q[0], p[1]-Q[1])
    return (d[0]*u[0] + d[1]*u[1], d[0]*m[0] + d[1]*m[1])   # (t, s)

# blob outline: a circle with a few low-frequency wobbles
C = at(-25, 128)
R = 74
random.seed(7)
waves = [(k, random.uniform(-0.07, 0.07), random.uniform(0, 2*math.pi)) for k in (2, 3, 5)]
def blob_r(a):
    return R * (1 + sum(amp*math.cos(k*a + ph) for k, amp, ph in waves))
outline = [(C[0] + blob_r(a)*math.cos(a), C[1] + blob_r(a)*math.sin(a))
           for a in [2*math.pi*i/180 for i in range(180)]]

# peaks: dots inside the blob, varied weights, kept apart
dots = []
tries = 0
while len(dots) < 12 and tries < 5000:
    tries += 1
    a = random.uniform(0, 2*math.pi)
    rr = math.sqrt(random.random()) * 0.72 * R
    p = (C[0] + rr*math.cos(a), C[1] + rr*math.sin(a))
    if all(math.hypot(p[0]-q[0], p[1]-q[1]) > 19 for (q, _) in dots):
        w = random.choice([0.35, 0.5, 0.7, 1.0])
        dots.append((p, w))

SIG = 19.0                                # bump radius (compact support)
def bump(r):
    return (1 - (r/SIG)**2)**2 if r < SIG else 0.0

# Pi_V f(t) = integral over the fiber at t of f, done numerically
tcoords = [(coords(p), w) for (p, w) in dots]
def proj(t):
    total = 0.0
    for ((tp, sp), w) in tcoords:
        dt = t - tp
        if abs(dt) >= SIG:
            continue
        half = math.sqrt(SIG*SIG - dt*dt)
        n = 40
        h = 2*half/n
        total += w * sum(bump(math.hypot(dt, -half + (i+0.5)*h)) for i in range(n)) * h
    return total

ots = [coords(p)[0] for p in outline]
tmin, tmax = min(ots), max(ots)
ts = [tmin + (tmax - tmin)*i/400 for i in range(401)]
vals = [proj(t) for t in ts]
scale = 44.0 / max(vals)                  # tallest point of the curve, px
curve = [at(t, v*scale) for t, v in zip(ts, vals)]

RED, LG, DG, LB, GRAY = "#d95f5f", "#93c893", "#2d6a2d", "#92b9e3", "#8a8a8a"
el = []
# V
V0, V1 = at(tmin - 45), at(tmax + 75)
el.append(f'<line x1="{V0[0]:.1f}" y1="{V0[1]:.1f}" x2="{V1[0]:.1f}" y2="{V1[1]:.1f}" stroke="{LB}" stroke-width="2.2"/>')
# shadow edges: from the blob's extreme points straight down to V
for tt in (tmin, tmax):
    i = min(range(len(outline)), key=lambda j: abs(ots[j] - tt))
    P = outline[i]
    foot = at(tt)
    el.append(f'<line x1="{P[0]:.1f}" y1="{P[1]:.1f}" x2="{foot[0]:.1f}" y2="{foot[1]:.1f}" '
              f'stroke="{RED}" stroke-width="1" stroke-dasharray="3 4" opacity="0.8"/>')
# blob outline
el.append('<path d="M ' + " L ".join(f"{p[0]:.1f} {p[1]:.1f}" for p in outline) +
          f' Z" fill="none" stroke="{GRAY}" stroke-width="1.6"/>')
# peaks
for (p, w) in dots:
    el.append(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{2.2 + 3.8*w:.1f}" fill="{RED}"/>')
# Pi_V f
el.append('<path d="M ' + " L ".join(f"{p[0]:.1f} {p[1]:.1f}" for p in curve) +
          f'" fill="none" stroke="{LG}" stroke-width="2"/>')
core = "".join(el)

# labels: pushed away from their feature in direction d (metric-free)
def norm(v):
    k = math.hypot(*v); return (v[0]/k, v[1]/k)
def place(P, d, tex, gap=9):
    d = norm(d)
    return (P[0] + d[0]*gap, P[1] + d[1]*gap, d, tex)

top = min(outline, key=lambda p: p[1] - 0.6*p[0])        # upper-left of blob
labels = [
    place(top, (-0.7, -0.7), "\\textcolor{#8a8a8a}{f}", 19),
    place(V1, u, "\\textcolor{#92b9e3}{V}"),
    place(at((tmin + tmax)/2), (-m[0], -m[1]), "\\textcolor{#93c893}{\\Pi_V f}", 8),
]
# crop the canvas vertically to the drawing (+ room for labels above/below)
ys = [p[1] for p in outline] + [p[1] for p in curve] + [V0[1], V1[1]] + [l[1] for l in labels]
Y0C = min(ys) - 26
HC = max(ys) + 26 - Y0C

spans = []
for (x, y, d, tex) in labels:
    tx, ty = (d[0]-1)*50, (d[1]-1)*50
    spans.append(
        f'<span style="position:absolute;left:{x/W*100:.2f}%;top:{(y-Y0C)/HC*100:.2f}%;width:0;height:0;">'
        f'<span style="position:absolute;left:0;top:0;white-space:nowrap;'
        f'transform:translate({tx:.0f}%, {ty:.0f}%);">${tex}$</span></span>')

svg = f'<svg viewBox="0 {Y0C:.1f} {W} {HC:.1f}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">{core}</svg>'
fig = f'<div style="position:relative;width:560px;max-width:100%;margin:1rem auto 0.3rem auto;">{svg}{"".join(spans)}</div>'

S = '/private/tmp/claude-501/-Users-ryan-riensou-github-io/39821c01-d3d9-4fbf-b891-b566b51aefbf/scratchpad'
with open(S + '/peaks-note.html', 'w') as f:
    f.write(fig)

pv = []
names = {"f}": "f", "V}": "V", "Pi": "ΠV f"}
for (x, y, d, tex) in labels:
    key = next(k for k in ("Pi", "f}", "V}") if k in tex)
    col = tex.split("{")[1].split("}")[0]
    anchor = "start" if d[0] > 0.3 else ("end" if d[0] < -0.3 else "middle")
    dy = "0.9em" if d[1] > 0.3 else ("-0.2em" if d[1] < -0.3 else "0.35em")
    pv.append(f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="{anchor}" dy="{dy}" font-family="serif" '
              f'font-style="italic" font-size="16" fill="{col}">{names[key]}</text>')
with open(S + '/peaks.svg', 'w') as f:
    f.write(f'<svg viewBox="0 {Y0C:.1f} {W} {HC:.1f}" xmlns="http://www.w3.org/2000/svg">{core}{"".join(pv)}</svg>')
print("built", len(dots), "peaks")
