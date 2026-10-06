# Two panels: left = the bare 4x4 grid labeled X; right = the same grid with
# three families of projection fibers (slope -1 gray, -2 green, -3 blue).
# The right panel cycles through the families one at a time (CSS animation);
# all three Pi labels stay visible, with the active one at full strength.
G = 42            # grid spacing, px
PAD = 0.45        # fiber overshoot past the grid, in grid units
W, H = 560, 216
STEP = 2.5        # seconds each family is shown; full cycle = 3 * STEP

CXL, CXR = 130, 395          # panel centers
Y0 = 12 + PAD*G + 3*G        # screen y of math b=0 (bottom row)

def to_screen(a, b, cx):
    return (cx - 1.5*G + a*G, Y0 - b*G)

def clip_line(m, c, lo=-PAD, hi=3+PAD):
    pts = []
    for a in (lo, hi):
        b = m*a + c
        if lo - 1e-9 <= b <= hi + 1e-9:
            pts.append((a, b))
    for b in (lo, hi):
        if abs(m) > 1e-12:
            a = (b - c) / m
            if lo - 1e-9 <= a <= hi + 1e-9:
                pts.append((a, b))
    uniq = []
    for p in pts:
        if all(abs(p[0]-q[0]) + abs(p[1]-q[1]) > 1e-6 for q in uniq):
            uniq.append(p)
    uniq.sort()
    return (uniq[0], uniq[-1]) if len(uniq) >= 2 else None

GRAY, GREEN, BLUE, RED = "#a8a8a8", "#93c893", "#92b9e3", "#d95f5f"

# (slope, number of level sets c, color, line opacity)
FAMILIES = [(-1, 7, GRAY, 0.6), (-2, 10, GREEN, 0.75), (-3, 13, BLUE, 0.75)]

def family_lines(slope, count, color, op):
    out = []
    for cval in range(count):
        seg = clip_line(slope, cval)
        if not seg:
            continue
        (a0, b0), (a1, b1) = seg
        x0, y0 = to_screen(a0, b0, CXR); x1, y1 = to_screen(a1, b1, CXR)
        out.append(f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" '
                   f'stroke="{color}" stroke-width="1" stroke-dasharray="3 4" opacity="{op}"/>')
    return "".join(out)

groups = [family_lines(*f) for f in FAMILIES]

dots = []
for cx in (CXL, CXR):
    for a in range(4):
        for b in range(4):
            x, y = to_screen(a, b, cx)
            dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="{RED}"/>')
dots = "".join(dots)

# Each family k is visible during [k*STEP, (k+1)*STEP) of the cycle. All use
# one keyframe set (visible for the first third); negative delays phase them.
T = 3 * STEP

style = f"""<style>
@keyframes gp-fam {{ 0% {{opacity:0}} 4% {{opacity:1}} 29% {{opacity:1}} 33.3% {{opacity:0}} 100% {{opacity:0}} }}
@keyframes gp-lbl {{ 0% {{opacity:.35}} 4% {{opacity:1}} 29% {{opacity:1}} 33.3% {{opacity:.35}} 100% {{opacity:.35}} }}
.gp-fam {{ opacity:0; animation: gp-fam {T}s linear infinite; }}
.gp-lbl {{ opacity:.35; animation: gp-lbl {T}s linear infinite; }}
.gp-k1 {{ animation-delay: 0s; }}
.gp-k2 {{ animation-delay: -{T - STEP:.2f}s; }}
.gp-k3 {{ animation-delay: -{T - 2*STEP:.2f}s; }}
@media (prefers-reduced-motion: reduce) {{
  .gp-fam, .gp-lbl {{ animation: none; opacity: 1; }}
}}
</style>"""

fam_svg = "".join(f'<g class="gp-fam gp-k{k+1}">{g}</g>' for k, g in enumerate(groups))
core = fam_svg + dots

lx = CXR + 1.5*G + PAD*G + 34
lym = Y0 - 1.5*G
labels = [
    (CXL, Y0 + 30, "\\textcolor{#d95f5f}{X}", ""),
    (lx, lym - 22, "\\textcolor{#a8a8a8}{\\Pi_{V_1}X}", "gp-lbl gp-k1"),
    (lx, lym,      "\\textcolor{#93c893}{\\Pi_{V_2}X}", "gp-lbl gp-k2"),
    (lx, lym + 22, "\\textcolor{#92b9e3}{\\Pi_{V_3}X}", "gp-lbl gp-k3"),
]
spans = []
for (x, y, tex, cls) in labels:
    cattr = f' class="{cls}"' if cls else ''
    spans.append(
        f'<span style="position:absolute;left:{x/W*100:.2f}%;top:{y/H*100:.2f}%;width:0;height:0;">'
        f'<span{cattr} style="position:absolute;left:0;top:0;white-space:nowrap;'
        f'transform:translate(-50%, -50%);">${tex}$</span></span>')

svg = f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;">{core}</svg>'
fig = (f'{style}<div style="position:relative;width:560px;max-width:100%;margin:1rem auto 0.3rem auto;">'
       f'{svg}{"".join(spans)}</div>')

S = '/private/tmp/claude-501/-Users-ryan-riensou-github-io/39821c01-d3d9-4fbf-b891-b566b51aefbf/scratchpad'
with open(S + '/grid-note.html', 'w') as f:
    f.write(fig)

# standalone animated preview page for checking in a browser
test = f'''<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.js"></script>
<style>body{{background:#1a1a1a;padding:3rem;}}</style></head><body><div id="f">{fig}</div>
<script>
var f = document.getElementById('f');
f.innerHTML = f.innerHTML.replace(/\\$([^$\\n]+?)\\$/g, function(_, t) {{
  return katex.renderToString(t, {{ throwOnError: false }});
}});
</script></body></html>'''
with open(S + '/grid-test.html', 'w') as f:
    f.write(test)
print('built')
