import math

# Counterexample: unit balls packed densely into B_N inside B_R. Every
# projection of the clump has length ~ N, the diameter of B_N; one such
# projection onto a line V is shown in magenta.
W = 560
CR, RR = (280, 160), 138                 # B_R
CN, RN = (232, 118), 40                  # B_N, inside B_R
BR = 5.0                                 # unit-ball radius, px

TH = math.radians(-62)
u = (math.cos(TH), math.sin(TH))         # along V (toward upper right)
n = (-u[1], u[0])
P0 = (CN[0] + n[0]*95, CN[1] + n[1]*95)  # V passes beside the clump

def on_v(t):
    return (P0[0] + u[0]*t, P0[1] + u[1]*t)
def tcoord(p):
    return (p[0]-P0[0])*u[0] + (p[1]-P0[1])*u[1]

# V clipped to slightly beyond B_R
dx, dy = P0[0]-CR[0], P0[1]-CR[1]
b = dx*u[0] + dy*u[1]
c = dx*dx + dy*dy - (RR + 14)**2
disc = math.sqrt(b*b - c)
TA, TB = -b - disc, -b + disc

# hexagonal packing of unit balls inside B_N
balls = []
step = 2*BR + 1.2
rows = int(RN // (step*0.866)) + 2
for j in range(-rows, rows + 1):
    y = CN[1] + j*step*0.866
    off = (step/2) if j % 2 else 0
    for i in range(-rows, rows + 1):
        x = CN[0] + i*step + off
        if math.hypot(x-CN[0], y-CN[1]) <= RN - BR - 1.5:
            balls.append((x, y))

RED, GRAY, LB, MAG = "#d95f5f", "#8a8a8a", "#92b9e3", "#d6449f"
el = []
el.append(f'<circle cx="{CR[0]}" cy="{CR[1]}" r="{RR}" fill="none" stroke="{GRAY}" stroke-width="1.6"/>')
a, z = on_v(TA), on_v(TB)
el.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{z[0]:.1f}" y2="{z[1]:.1f}" stroke="{LB}" stroke-width="2"/>')

# shadow of B_N on V: the projection interval, with dotted edges
tc = tcoord(CN)
for t in (tc - RN, tc + RN):
    edge = (CN[0] + u[0]*(t - tc), CN[1] + u[1]*(t - tc))
    foot = on_v(t)
    el.append(f'<line x1="{edge[0]:.1f}" y1="{edge[1]:.1f}" x2="{foot[0]:.1f}" y2="{foot[1]:.1f}" '
              f'stroke="{GRAY}" stroke-width="1" stroke-dasharray="3 4"/>')
s0, s1 = on_v(tc - RN), on_v(tc + RN)
el.append(f'<line x1="{s0[0]:.1f}" y1="{s0[1]:.1f}" x2="{s1[0]:.1f}" y2="{s1[1]:.1f}" stroke="{MAG}" stroke-width="4"/>')

el.append(f'<circle cx="{CN[0]}" cy="{CN[1]}" r="{RN}" fill="none" stroke="{GRAY}" stroke-width="1.2"/>')
for (x, y) in balls:
    el.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{BR}" fill="none" stroke="{RED}" stroke-width="1.2"/>')
core = "".join(el)

# labels, pushed off their features (metric-free placement)
def norm(v):
    k = math.hypot(*v); return (v[0]/k, v[1]/k)
def place(P, d, tex, gap=8):
    d = norm(d)
    return (P[0] + d[0]*gap, P[1] + d[1]*gap, d, tex)
def on_circle(C, r, ang):
    return (C[0] + r*math.cos(ang), C[1] + r*math.sin(ang))

ang_r = math.radians(200)
ang_n = math.radians(-120)
labels = [
    place(on_circle(CR, RR, ang_r), (math.cos(ang_r), math.sin(ang_r)), "\\textcolor{#8a8a8a}{B_R}"),
    place(on_circle(CN, RN, ang_n), (math.cos(ang_n), math.sin(ang_n)), "\\textcolor{#8a8a8a}{B_N}"),
    place(on_circle(CN, RN, math.radians(150)), (-1, 0.5), "\\textcolor{#d95f5f}{X}", 10),
    place(on_v(tc), n, "\\textcolor{#d6449f}{N}", 9),
    place(z, u, "\\textcolor{#92b9e3}{V}"),
]

# crop vertically to content + label room
ys = [CR[1]-RR, CR[1]+RR, a[1], z[1]] + [l[1] for l in labels]
Y0C = min(ys) - 22
HC = max(ys) + 22 - Y0C

spans = []
for (x, y, d, tex) in labels:
    tx, ty = (d[0]-1)*50, (d[1]-1)*50
    spans.append(
        f'<span style="position:absolute;left:{x/W*100:.2f}%;top:{(y-Y0C)/HC*100:.2f}%;width:0;height:0;">'
        f'<span style="position:absolute;left:0;top:0;white-space:nowrap;'
        f'transform:translate({tx:.0f}%, {ty:.0f}%);">${tex}$</span></span>')

svg = (f'<svg viewBox="0 {Y0C:.1f} {W} {HC:.1f}" xmlns="http://www.w3.org/2000/svg" '
       f'style="width:100%;height:auto;display:block;">{core}</svg>')
fig = f'<div style="position:relative;width:560px;max-width:100%;margin:1rem auto 0.3rem auto;">{svg}{"".join(spans)}</div>'

S = '/private/tmp/claude-501/-Users-ryan-riensou-github-io/39821c01-d3d9-4fbf-b891-b566b51aefbf/scratchpad'
with open(S + '/balls-note.html', 'w') as f:
    f.write(fig)

pv = []
names = {"B_R": "Bᵣ", "B_N": "Bₙ", "{X}": "X", "{N}": "N", "{V}": "V"}
for (x, y, d, tex) in labels:
    key = next(k for k in names if k in tex)
    col = tex.split("{")[1].split("}")[0]
    anchor = "start" if d[0] > 0.3 else ("end" if d[0] < -0.3 else "middle")
    dyy = "0.9em" if d[1] > 0.3 else ("-0.2em" if d[1] < -0.3 else "0.35em")
    pv.append(f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="{anchor}" dy="{dyy}" font-family="serif" '
              f'font-style="italic" font-size="16" fill="{col}">{names[key]}</text>')
with open(S + '/balls.svg', 'w') as f:
    f.write(f'<svg viewBox="0 {Y0C:.1f} {W} {HC:.1f}" xmlns="http://www.w3.org/2000/svg">{core}{"".join(pv)}</svg>')
print("built", len(balls), "balls")
