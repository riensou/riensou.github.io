import math, itertools

# ---------------- geometry ----------------
W, H = 560, 312
th1 = math.radians(13)
u1 = (math.cos(th1), math.sin(th1)); A1 = (30, 185)
n1 = (-math.sin(th1), math.cos(th1))          # unit normal, +n1 side = below line

def _min_gap(deg, base, s, n1):
    u = (math.cos(math.radians(deg)), math.sin(math.radians(deg)))
    ts = []
    for (x, y) in base:
        for P in ((x, y), (x + n1[0]*s, y + n1[1]*s)):
            ts.append(P[0]*u[0] + P[1]*u[1])
    ts.sort()
    return min(b - a for a, b in zip(ts, ts[1:]))

_bx = [150, 220, 285, 350]
best_gap, best, base = -1, -62, None
for ys in itertools.product([18, 26, 34, 42, 50], repeat=4):
    b = list(zip(_bx, ys))
    for d in range(-72, -51):
        g = _min_gap(d, b, 58, n1)
        if g > best_gap:
            best_gap, best, base = g, d, b

th2 = math.radians(best)
u2 = (math.cos(th2), math.sin(th2)); A2 = (344, 375)
n2 = (-u2[1], u2[0])                          # +n2 side = right of line

s = 58
pts = []
for (x, y) in base:
    pts.append((x, y)); pts.append((x + n1[0]*s, y + n1[1]*s))

def proj(P, A, u):
    t = (P[0]-A[0])*u[0] + (P[1]-A[1])*u[1]
    return (A[0] + t*u[0], A[1] + t*u[1], t)

p1 = [proj(P, A1, u1) for P in pts]
p2 = [proj(P, A2, u2) for P in pts]

def seg(A, u, ts, pad0, pad1):
    t0, t1 = min(ts) - pad0, max(ts) + pad1
    return (A[0]+u[0]*t0, A[1]+u[1]*t0, A[0]+u[0]*t1, A[1]+u[1]*t1)

L1 = seg(A1, u1, [q[2] for q in p1], 85, 45)
L2 = seg(A2, u2, [q[2] for q in p2], 60, 50)

RED, LG, DG, LB, DB = "#d95f5f", "#93c893", "#2d6a2d", "#92b9e3", "#2b5d8a"
el = []
el.append(f'<line x1="{L1[0]:.0f}" y1="{L1[1]:.0f}" x2="{L1[2]:.0f}" y2="{L1[3]:.0f}" stroke="{LG}" stroke-width="2.2"/>')
el.append(f'<line x1="{L2[0]:.0f}" y1="{L2[1]:.0f}" x2="{L2[2]:.0f}" y2="{L2[3]:.0f}" stroke="{LB}" stroke-width="2.2"/>')
for P, Q in zip(pts, p1):
    el.append(f'<line x1="{P[0]:.1f}" y1="{P[1]:.1f}" x2="{Q[0]:.1f}" y2="{Q[1]:.1f}" stroke="{DG}" stroke-width="1" stroke-dasharray="3 4" opacity="0.75"/>')
for P, Q in zip(pts, p2):
    el.append(f'<line x1="{P[0]:.1f}" y1="{P[1]:.1f}" x2="{Q[0]:.1f}" y2="{Q[1]:.1f}" stroke="{DB}" stroke-width="1" stroke-dasharray="3 4" opacity="0.75"/>')
for Q in p1:
    el.append(f'<circle cx="{Q[0]:.1f}" cy="{Q[1]:.1f}" r="4" fill="{DG}"/>')
for Q in p2:
    el.append(f'<circle cx="{Q[0]:.1f}" cy="{Q[1]:.1f}" r="4" fill="{DB}"/>')
for P in pts:
    el.append(f'<circle cx="{P[0]:.1f}" cy="{P[1]:.1f}" r="4.5" fill="{RED}"/>')

# ---------------- labels, from first principles ----------------
# A rotated KaTeX span's box size is unknowable here, so every anchor pins a
# chosen POINT OF THE BOX using translate percentages (which are relative to
# the box's own size):
#
#   mode "edge":   transform: rotate(t) translate(-50%, 0) about origin
#                  left-top pins the TOP-EDGE MIDPOINT exactly at the anchor;
#                  the body then extends along R(t)*(0,1) = (-sin t, cos t),
#                  which IS the outward normal n_hat. Anchor = (line point) +
#                  n_hat*GAP  =>  visible gap = GAP exactly, any angle, any
#                  text metrics.
#   mode "center": rotate(t) translate(-50%, -50%) pins the box center; used
#                  where there is no line to clear (axis-tip names, X tag).
GAP = 10

mid1 = (sum(q[0] for q in p1)/len(p1), sum(q[1] for q in p1)/len(p1))
mid2 = (sum(q[0] for q in p2)/len(p2), sum(q[1] for q in p2)/len(p2))
deg1, deg2 = 13, best

labels = [
    (pts[0][0]-30, pts[0][1]-6, 0, "center", "\\textcolor{#d95f5f}{X}", "X", RED),
    (mid1[0]+n1[0]*GAP, mid1[1]+n1[1]*GAP, deg1, "edge",
     "\\textcolor{#2d6a2d}{\\Pi_{V_1}X}", "ΠV₁X", DG),
    (L1[0]-u1[0]*24, L1[1]-u1[1]*24, deg1, "center",
     "\\textcolor{#93c893}{V_1}", "V₁", LG),
    (mid2[0]+n2[0]*GAP, mid2[1]+n2[1]*GAP, deg2, "edge",
     "\\textcolor{#2b5d8a}{\\Pi_{V_2}X}", "ΠV₂X", DB),
    (L2[2]+u2[0]*24, L2[3]+u2[1]*24, deg2, "center",
     "\\textcolor{#92b9e3}{V_2}", "V₂", LB),
]

# SVG preview stand-ins (approximate; the HTML/KaTeX version is authoritative)
svg_labels = []
for (x, y, rot, mode, tex, plain, col) in labels:
    dy = '1.0em' if mode == 'edge' else '0.35em'
    svg_labels.append(
        f'<text x="{x:.0f}" y="{y:.0f}" transform="rotate({rot} {x:.0f} {y:.0f})" '
        f'text-anchor="middle" dy="{dy}" font-family="serif" font-style="italic" '
        f'font-size="17" fill="{col}">{plain}</text>')

core = "".join(el)
S = '/private/tmp/claude-501/-Users-ryan-riensou-github-io/39821c01-d3d9-4fbf-b891-b566b51aefbf/scratchpad'
with open(S + '/fig.svg', 'w') as f:
    f.write(f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">{core}{"".join(svg_labels)}</svg>')

svg_bare = f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">{core}</svg>'

spans = []
for (x, y, rot, mode, tex, plain, col) in labels:
    shift = 'translate(-50%, 0%)' if mode == 'edge' else 'translate(-50%, -50%)'
    spans.append(
        f'<span style="position:absolute;left:{x/W*100:.2f}%;top:{y/H*100:.2f}%;width:0;height:0;">'
        f'<span style="position:absolute;left:0;top:0;white-space:nowrap;'
        f'transform:rotate({rot}deg) {shift};transform-origin:left top;" data-tex="{tex}"></span></span>')
fig = f'<div style="position:relative;width:560px;max-width:100%;margin:1rem auto 0.3rem auto;">{svg_bare}{"".join(spans)}</div>'

with open(S + '/fig-snippet.html', 'w') as f:
    f.write(fig)

# note variant: the site's markdown pipeline renders $...$ wherever it
# appears, so the TeX goes in the span CONTENT instead of a data attribute
note_spans = []
for (x, y, rot, mode, tex, plain, col) in labels:
    shift = 'translate(-50%, 0%)' if mode == 'edge' else 'translate(-50%, -50%)'
    note_spans.append(
        f'<span style="position:absolute;left:{x/W*100:.2f}%;top:{y/H*100:.2f}%;width:0;height:0;">'
        f'<span style="position:absolute;left:0;top:0;white-space:nowrap;'
        f'transform:rotate({rot}deg) {shift};transform-origin:left top;">${tex}$</span></span>')
fig_note = f'<div style="position:relative;width:560px;max-width:100%;margin:1rem auto 0.3rem auto;">{svg_bare}{"".join(note_spans)}</div>'
with open(S + '/fig-note.html', 'w') as f:
    f.write(fig_note)

test = f'''<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.js"></script>
<style>body{{background:#1a1a1a;padding:3rem;}}</style></head><body>{fig}
<script>
document.querySelectorAll('[data-tex]').forEach(function(s) {{
    katex.render(s.getAttribute('data-tex'), s, {{ throwOnError: false }});
}});
</script></body></html>'''
with open('/Users/ryan/riensou.github.io/test-fig.html', 'w') as f:
    f.write(test)
print('built: blue angle', best, 'min blue dot gap %.1f' % best_gap)
