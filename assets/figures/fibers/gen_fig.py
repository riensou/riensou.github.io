import math

# R^d drawn as the plane; V a line through the origin; a point y on V with its
# fiber Pi_V^{-1}(y) (the affine line through y perpendicular to V); and a
# segment U of V.
W, H = 560, 300
O = (250, 170)                       # origin
TH = math.radians(-32)               # V's direction (screen coords, y down)
u = (math.cos(TH), math.sin(TH))     # along V, toward upper right
n = (-u[1], u[0])                    # normal to V, toward lower right

AX, VB, LB, LG, DG, GRAY = "#5a5a5a", "#2b5d8a", "#92b9e3", "#93c893", "#2d6a2d", "#8a8a8a"

def at(t, s=0.0):
    """point at distance t along V and s along its normal"""
    return (O[0] + u[0]*t + n[0]*s, O[1] + u[1]*t + n[1]*s)

el = []
# axes
el.append(f'<line x1="{O[0]-200}" y1="{O[1]}" x2="{O[0]+260}" y2="{O[1]}" stroke="{AX}" stroke-width="1"/>')
el.append(f'<line x1="{O[0]}" y1="{O[1]+120}" x2="{O[0]}" y2="{O[1]-160}" stroke="{AX}" stroke-width="1"/>')

# U's endpoints along V, and the slab Pi_V^{-1}(U) over U (drawn under V)
TU0, TU1 = 135, 205
SLAB_LO, SLAB_HI = -65, 95
c = [at(TU0, SLAB_LO), at(TU1, SLAB_LO), at(TU1, SLAB_HI), at(TU0, SLAB_HI)]
el.append('<polygon points="' + " ".join(f"{p[0]:.1f},{p[1]:.1f}" for p in c) +
          f'" fill="{LB}" opacity="0.16"/>')
for tt in (TU0, TU1):
    a, b = at(tt, SLAB_LO), at(tt, SLAB_HI)
    el.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" '
              f'stroke="{LB}" stroke-width="1" stroke-dasharray="4 4" opacity="0.7"/>')

# V
V0, V1 = at(-210), at(250)
el.append(f'<line x1="{V0[0]:.1f}" y1="{V0[1]:.1f}" x2="{V1[0]:.1f}" y2="{V1[1]:.1f}" stroke="{LB}" stroke-width="2.2"/>')

# U: a segment of V
U0, U1 = at(TU0), at(TU1)
el.append(f'<line x1="{U0[0]:.1f}" y1="{U0[1]:.1f}" x2="{U1[0]:.1f}" y2="{U1[1]:.1f}" stroke="{VB}" stroke-width="4.5"/>')
# end notches, perpendicular to V
for tt in (TU0, TU1):
    a, b = at(tt, -8), at(tt, 8)
    el.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{VB}" stroke-width="1.6"/>')

# y and its fiber
TY = 65
Y = at(TY)
F0, F1 = at(TY, -125), at(TY, 105)
el.append(f'<line x1="{F0[0]:.1f}" y1="{F0[1]:.1f}" x2="{F1[0]:.1f}" y2="{F1[1]:.1f}" stroke="{DG}" stroke-width="1.2" stroke-dasharray="4 4"/>')
el.append(f'<circle cx="{Y[0]:.1f}" cy="{Y[1]:.1f}" r="4.5" fill="{DG}"/>')

core = "".join(el)

# Labels. Each is placed in a direction d (unit vector) from a feature point P
# at distance GAP. The box is shifted by translate((dx-1)*50%, (dy-1)*50%),
# which puts it on the far side of the anchor in direction d: right of the
# anchor when d points right, left when d points left, centered when d is
# vertical, and the same vertically. No text metrics are needed.
GAP = 9
def norm(v):
    m = math.hypot(*v); return (v[0]/m, v[1]/m)

def place(P, d, tex, gap=GAP):
    d = norm(d)
    return (P[0] + d[0]*gap, P[1] + d[1]*gap, d, tex)

labels = [
    place((O[0]-200, O[1]-150), (1, 1), "\\textcolor{#8a8a8a}{\\mathbb{R}^d}", 0),
    place(V1, u, "\\textcolor{#92b9e3}{V}"),
    place(at((TU0+TU1)/2), n, "\\textcolor{#2b5d8a}{U}", 12),
    place(Y, (n[0]-u[0]*0.9, n[1]-u[1]*0.9), "\\textcolor{#2d6a2d}{y}"),
    place(F0, (-n[0], -n[1]), "\\textcolor{#2d6a2d}{\\Pi_V^{-1}(y)}", 6),
    place(at(TU1, 55), (1, 0), "\\textcolor{#2b5d8a}{\\Pi_V^{-1}(U)}", 8),
]

spans = []
for (x, y, d, tex) in labels:
    tx, ty = (d[0]-1)*50, (d[1]-1)*50
    spans.append(
        f'<span style="position:absolute;left:{x/W*100:.2f}%;top:{y/H*100:.2f}%;width:0;height:0;">'
        f'<span style="position:absolute;left:0;top:0;white-space:nowrap;'
        f'transform:translate({tx:.0f}%, {ty:.0f}%);">${tex}$</span></span>')

svg = f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">{core}</svg>'
fig = f'<div style="position:relative;width:560px;max-width:100%;margin:1rem auto 0.3rem auto;">{svg}{"".join(spans)}</div>'

S = '/private/tmp/claude-501/-Users-ryan-riensou-github-io/39821c01-d3d9-4fbf-b891-b566b51aefbf/scratchpad'
with open(S + '/fiber-note.html', 'w') as f:
    f.write(fig)

# SVG preview with stand-in text (approximate)
pv = []
plain = {"R": "ℝd", "V}": "V", "U": "U", "{y}": "y", "Pi": "ΠV⁻¹(y)", "PiU": "ΠV⁻¹(U)"}
for (x, y, d, tex) in labels:
    key = "PiU" if "(U)" in tex else next(k for k in ("Pi", "U", "R", "V}", "{y}") if k in tex)
    col = tex.split("{")[1].split("}")[0]
    anchor = "start" if d[0] > 0.3 else ("end" if d[0] < -0.3 else "middle")
    dy = "0.9em" if d[1] > 0.3 else ("-0.2em" if d[1] < -0.3 else "0.35em")
    pv.append(f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="{anchor}" dy="{dy}" '
              f'font-family="serif" font-style="italic" font-size="16" fill="{col}">{plain[key]}</text>')
with open(S + '/fiber.svg', 'w') as f:
    f.write(f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">{core}{"".join(pv)}</svg>')
print("built")
