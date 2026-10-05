// A drifting universe of randomly generated networks on a closed surface
// whose topology is itself randomized on every page load.
//
// The four screen edges are glued into two pairs, drawn fresh each refresh:
// either top~bottom with left~right, or top~left with bottom~right, or
// top~right with bottom~left. Each gluing also randomly reverses parameter
// direction (a flip) or not. Every identification is a bijection edge->edge;
// adjacent-edge gluings rotate (and rescale, since W != H) on the way
// through. Crossings stay seamless: a cluster straddling a seam is drawn at
// every image under the gluing maps, so whatever leaves one edge is already
// visible entering its partner edge, zero latency. When a cluster's center
// crosses, its coordinates are rebased through the map - invisible, since
// the drawn image set is identical before and after.
//
// Physics, simple rules only: nodes + springs, cursor force adds momentum,
// velocity relaxes toward each cluster's drift. Click near a node (or its
// seam image) to grab it; release to throw. Colors follow the theme; static
// under prefers-reduced-motion; paused when the tab is hidden.
(function() {
    var canvas = document.getElementById('sidebar-field');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    var W = 0, H = 0;

    // --- the gluing scheme, rolled once per page load ---
    var PAIRINGS = [
        [['T', 'B'], ['L', 'R']],
        [['T', 'L'], ['B', 'R']],
        [['T', 'R'], ['B', 'L']]
    ];
    var pairing = PAIRINGS[Math.floor(Math.random() * 3)];
    var flips = [Math.random() < 0.5, Math.random() < 0.5];
    var exitMap = {}; // edge name -> affine map {m00,m01,m10,m11,tx,ty, inv, s}

    function edgeGeom(name) {
        // endpoints and outward normal of each screen edge
        if (name === 'T') return { p0: [0, 0], p1: [W, 0], n: [0, -1], len: W };
        if (name === 'B') return { p0: [0, H], p1: [W, H], n: [0, 1], len: W };
        if (name === 'L') return { p0: [0, 0], p1: [0, H], n: [-1, 0], len: H };
        return { p0: [W, 0], p1: [W, H], n: [1, 0], len: H };
    }
    function affineFrom3(p, q) {
        // solve M,t from three point correspondences p[i] -> q[i]
        var ax = p[1][0] - p[0][0], ay = p[1][1] - p[0][1];
        var bx = p[2][0] - p[0][0], by = p[2][1] - p[0][1];
        var cx = q[1][0] - q[0][0], cy = q[1][1] - q[0][1];
        var dx = q[2][0] - q[0][0], dy = q[2][1] - q[0][1];
        var det = ax * by - ay * bx;
        var m00 = (cx * by - dx * ay) / det, m01 = (dx * ax - cx * bx) / det;
        var m10 = (cy * by - dy * ay) / det, m11 = (dy * ax - cy * bx) / det;
        return {
            m00: m00, m01: m01, m10: m10, m11: m11,
            tx: q[0][0] - m00 * p[0][0] - m01 * p[0][1],
            ty: q[0][1] - m10 * p[0][0] - m11 * p[0][1]
        };
    }
    function buildGluings() {
        for (var g = 0; g < 2; g++) {
            var E1 = edgeGeom(pairing[g][0]), E2 = edgeGeom(pairing[g][1]);
            var flip = flips[g];
            [[E1, E2, pairing[g][0]], [E2, E1, pairing[g][1]]].forEach(function(dir) {
                var A = dir[0], B = dir[1];
                var s = B.len / A.len;
                function ePt(E, u) { return [E.p0[0] + (E.p1[0] - E.p0[0]) * u, E.p0[1] + (E.p1[1] - E.p0[1]) * u]; }
                var f0 = flip ? 1 : 0, f1 = flip ? 0 : 1;
                var q0 = ePt(B, f0), q1 = ePt(B, f1);
                var T = affineFrom3(
                    [ePt(A, 0), ePt(A, 1), [ePt(A, 0)[0] + A.n[0], ePt(A, 0)[1] + A.n[1]]],
                    [q0, q1, [q0[0] - B.n[0] * s, q0[1] - B.n[1] * s]]
                );
                T.s = s;
                var det = T.m00 * T.m11 - T.m01 * T.m10;
                T.inv = { m00: T.m11 / det, m01: -T.m01 / det, m10: -T.m10 / det, m11: T.m00 / det };
                exitMap[dir[2]] = T;
            });
        }
    }

    function resize() {
        var dpr = window.devicePixelRatio || 1;
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.max(1, W * dpr);
        canvas.height = Math.max(1, H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildGluings();
    }
    window.addEventListener('resize', resize);
    resize();

    var colors = { node: '#5cb85c', edge: '#404040' };
    function updateColors() {
        var cs = getComputedStyle(document.body);
        colors.node = cs.getPropertyValue('--accent').trim() || colors.node;
        colors.edge = cs.getPropertyValue('--border').trim() || colors.edge;
    }
    updateColors();
    new MutationObserver(updateColors).observe(document.body, { attributes: true, attributeFilter: ['class', 'data-accent'] });

    // --- every cluster is rolled fresh: node count, spread, elongation, and
    // wiring density all random, so no two are alike ---
    function generate() {
        if (Math.random() < 0.12) {
            var pair = Math.random() < 0.4;
            return {
                pos: pair ? [[0, 0], [10 + Math.random() * 8, 0]] : [[0, 0]],
                edges: pair ? [[0, 1]] : [],
                speedMult: 2.0 + Math.random() * 1.4
            };
        }
        var k = 4 + Math.floor(Math.random() * 12);
        var R = 26 + Math.random() * 44;
        var squash = 0.25 + Math.random() * 0.75;
        var rot = Math.random() * Math.PI;
        var pos = [], i, j;
        for (i = 0; i < k; i++) {
            var a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R;
            var x = Math.cos(a) * rr, y = Math.sin(a) * rr * squash;
            pos.push([x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)]);
        }
        function d2(i, j) {
            var dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1];
            return dx * dx + dy * dy;
        }
        var edges = [], seen = {};
        function addEdge(i, j) {
            var key = i < j ? i + '-' + j : j + '-' + i;
            if (!seen[key]) { seen[key] = 1; edges.push(i < j ? [i, j] : [j, i]); }
        }
        for (i = 0; i < k; i++) {
            var best = -1, bd = 1e18;
            for (j = 0; j < k; j++) if (j !== i && d2(i, j) < bd) { bd = d2(i, j); best = j; }
            if (best >= 0) addEdge(i, best);
        }
        var t2 = Math.pow(R * (0.35 + Math.random() * 0.55), 2);
        var p = 0.25 + Math.random() * 0.6;
        for (i = 0; i < k; i++)
            for (j = i + 1; j < k; j++)
                if (d2(i, j) < t2 && Math.random() < p) addEdge(i, j);
        return { pos: pos, edges: edges };
    }

    var clusters = [];
    function targetCount() { return Math.max(12, Math.min(44, Math.round((W * H) / 45000))); }

    function spawnCluster() {
        var shape = generate();
        var cx, cy, tx, ty;
        var SW = 260; // the sidebar corridor gets a dedicated share of traffic
        if (Math.random() < 0.45) {
            cx = Math.random() * SW; cy = Math.random() * H;
            tx = Math.max(0, Math.min(SW, cx + (Math.random() - 0.5) * 160));
            ty = cy + (Math.random() < 0.5 ? H : -H);
        } else {
            cx = Math.random() * W; cy = Math.random() * H;
            var ang = Math.random() * Math.PI * 2;
            tx = cx + Math.cos(ang) * 1000; ty = cy + Math.sin(ang) * 1000;
        }
        var d = Math.hypot(tx - cx, ty - cy) || 1;
        var speed = (0.07 + Math.random() * 0.11) * (shape.speedMult || 1);
        var bvx = (tx - cx) / d * speed, bvy = (ty - cy) / d * speed;
        var omega = (Math.random() - 0.5) * 0.0025;
        var nodes = shape.pos.map(function(p) {
            return {
                x: cx + p[0], y: cy + p[1],
                vx: bvx - p[1] * omega, vy: bvy + p[0] * omega
            };
        });
        var springs = shape.edges.map(function(e) {
            var a = shape.pos[e[0]], b = shape.pos[e[1]];
            return { i: e[0], j: e[1], rest: Math.hypot(a[0] - b[0], a[1] - b[1]) };
        });
        return { nodes: nodes, springs: springs, bvx: bvx, bvy: bvy, scale: 1 };
    }
    for (var c0 = 0; c0 < targetCount(); c0++) clusters.push(spawnCluster());

    function apX(T, x, y) { return T.m00 * x + T.m01 * y + T.tx; }
    function apY(T, x, y) { return T.m10 * x + T.m11 * y + T.ty; }
    var IDENT = { m00: 1, m01: 0, m10: 0, m11: 1, tx: 0, ty: 0, s: 1,
                  inv: { m00: 1, m01: 0, m10: 0, m11: 1 } };

    // which seam images does this cluster need right now?
    function imagesFor(cl) {
        var ns = cl.nodes;
        var minX = 1e18, maxX = -1e18, minY = 1e18, maxY = -1e18;
        for (var i = 0; i < ns.length; i++) {
            var n = ns[i];
            if (n.x < minX) minX = n.x;
            if (n.x > maxX) maxX = n.x;
            if (n.y < minY) minY = n.y;
            if (n.y > maxY) maxY = n.y;
        }
        cl._minX = minX; cl._maxX = maxX; cl._minY = minY; cl._maxY = maxY;
        var out = [IDENT];
        if (minY < 0) out.push(exitMap.T);
        if (maxY > H) out.push(exitMap.B);
        if (minX < 0) out.push(exitMap.L);
        if (maxX > W) out.push(exitMap.R);
        return out;
    }

    // rebase: push the stored coordinates through one gluing map. Velocities
    // transform by the linear part; spring rests scale with the map.
    function rebase(cl, T) {
        var ns = cl.nodes, i;
        for (i = 0; i < ns.length; i++) {
            var n = ns[i];
            var nx = apX(T, n.x, n.y), ny = apY(T, n.x, n.y);
            var nvx = T.m00 * n.vx + T.m01 * n.vy, nvy = T.m10 * n.vx + T.m11 * n.vy;
            n.x = nx; n.y = ny; n.vx = nvx; n.vy = nvy;
        }
        var nbvx = T.m00 * cl.bvx + T.m01 * cl.bvy, nbvy = T.m10 * cl.bvx + T.m11 * cl.bvy;
        cl.bvx = nbvx; cl.bvy = nbvy;
        for (i = 0; i < cl.springs.length; i++) cl.springs[i].rest *= T.s;
        cl.scale *= T.s;
    }

    var mouse = { x: -1e9, y: -1e9 };
    window.addEventListener('mousemove', function(e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseout', function(e) { if (!e.relatedTarget) { mouse.x = -1e9; mouse.y = -1e9; } });

    var grab = null, GRAB_R = 48;
    window.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        if (e.target.closest && e.target.closest('a, button, input, textarea, select, img')) return;
        var best = null, bestT = null, bestCl = null, bd = GRAB_R * GRAB_R;
        for (var c = 0; c < clusters.length; c++) {
            var cl = clusters[c], ims = imagesFor(cl), ns = cl.nodes;
            for (var t = 0; t < ims.length; t++) {
                for (var i = 0; i < ns.length; i++) {
                    var dx = apX(ims[t], ns[i].x, ns[i].y) - e.clientX;
                    var dy = apY(ims[t], ns[i].x, ns[i].y) - e.clientY;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < bd) { bd = d2; best = ns[i]; bestT = ims[t]; bestCl = cl; }
                }
            }
        }
        if (best) {
            if (bestT !== IDENT) rebase(bestCl, bestT); // visual no-op
            grab = best;
            e.preventDefault();
        }
    });
    window.addEventListener('mouseup', function() { grab = null; });
    window.addEventListener('blur', function() { grab = null; });

    function clusterGrabbed(cl) {
        if (!grab) return false;
        for (var i = 0; i < cl.nodes.length; i++) if (cl.nodes[i] === grab) return true;
        return false;
    }

    var K = 0.02;       // spring stiffness
    var RELAX = 0.985;  // decay of velocity relative to the drift
    var PUSH_R = 60, PUSH_F = 0.08;
    var REP_R = 26, REP_F = 0.015; // slight node-node repulsion at close range
    var MAXS = 2.2; // edges clamp at this multiple of rest length (plus a little slack)

    function step() {
        // gentle mutual push between any two nodes that get close, cluster
        // or not — keeps tangles from collapsing onto themselves
        var all = [];
        for (var cc = 0; cc < clusters.length; cc++) {
            var cns = clusters[cc].nodes;
            for (var ii = 0; ii < cns.length; ii++) all.push(cns[ii]);
        }
        for (var p = 0; p < all.length; p++) {
            for (var q = p + 1; q < all.length; q++) {
                var ra = all[p], rb = all[q];
                var rdx = rb.x - ra.x, rdy = rb.y - ra.y;
                if (rdx > REP_R || rdx < -REP_R || rdy > REP_R || rdy < -REP_R) continue;
                var rd = Math.hypot(rdx, rdy);
                if (rd < REP_R && rd > 0.5) {
                    var rf = REP_F * (1 - rd / REP_R) / rd;
                    ra.vx -= rdx * rf; ra.vy -= rdy * rf;
                    rb.vx += rdx * rf; rb.vy += rdy * rf;
                }
            }
        }
        for (var c = 0; c < clusters.length; c++) {
            var cl = clusters[c];
            var ns = cl.nodes, sp = cl.springs, i;
            for (i = 0; i < sp.length; i++) {
                var s = sp[i], a = ns[s.i], b = ns[s.j];
                var dx = b.x - a.x, dy = b.y - a.y;
                var d = Math.hypot(dx, dy) || 1;
                var f = K * (d - s.rest) / d;
                a.vx += dx * f; a.vy += dy * f;
                b.vx -= dx * f; b.vy -= dy * f;
            }
            var ims = imagesFor(cl);
            for (i = 0; i < ns.length; i++) {
                var n = ns[i];
                if (n === grab) {
                    n.vx = (n.vx + (mouse.x - n.x) * 0.22) * 0.78;
                    n.vy = (n.vy + (mouse.y - n.y) * 0.22) * 0.78;
                } else {
                    // the cursor pushes every visible image; the force pulls
                    // back through the map's inverse linear part
                    for (var t = 0; t < ims.length; t++) {
                        var T = ims[t];
                        var mdx = apX(T, n.x, n.y) - mouse.x, mdy = apY(T, n.x, n.y) - mouse.y;
                        var md = Math.hypot(mdx, mdy);
                        if (md < PUSH_R && md > 0.5) {
                            var mf = PUSH_F * (1 - md / PUSH_R) / md;
                            n.vx += T.inv.m00 * mdx * mf + T.inv.m01 * mdy * mf;
                            n.vy += T.inv.m10 * mdx * mf + T.inv.m11 * mdy * mf;
                        }
                    }
                    n.vx = cl.bvx + (n.vx - cl.bvx) * RELAX;
                    n.vy = cl.bvy + (n.vy - cl.bvy) * RELAX;
                }
                n.x += n.vx; n.y += n.vy;
            }
            // hard cap on edge length: springs can stretch, but never past
            // MAXS x rest — beyond that the nodes are reeled in directly
            for (i = 0; i < sp.length; i++) {
                var s2 = sp[i], a2 = ns[s2.i], b2 = ns[s2.j];
                var ddx = b2.x - a2.x, ddy = b2.y - a2.y;
                var dd = Math.hypot(ddx, ddy) || 1;
                var maxLen = s2.rest * MAXS + 24;
                if (dd > maxLen) {
                    var excess = (dd - maxLen) / dd;
                    if (a2 === grab) { b2.x -= ddx * excess; b2.y -= ddy * excess; }
                    else if (b2 === grab) { a2.x += ddx * excess; a2.y += ddy * excess; }
                    else {
                        a2.x += ddx * excess * 0.5; a2.y += ddy * excess * 0.5;
                        b2.x -= ddx * excess * 0.5; b2.y -= ddy * excess * 0.5;
                    }
                }
            }
            if (!clusterGrabbed(cl)) {
                // rebase when the center crosses a seam (invisible: the drawn
                // image set is identical before and after)
                imagesFor(cl);
                var ccx = (cl._minX + cl._maxX) / 2, ccy = (cl._minY + cl._maxY) / 2;
                if (ccy < 0) rebase(cl, exitMap.T);
                else if (ccy > H) rebase(cl, exitMap.B);
                else if (ccx < 0) rebase(cl, exitMap.L);
                else if (ccx > W) rebase(cl, exitMap.R);
                // adjacent-edge gluings rescale; breathe gently back to
                // native size so sizes stay bounded forever
                if (Math.abs(cl.scale - 1) > 0.01) {
                    var g = Math.pow(1 / cl.scale, 0.004);
                    var gx = 0, gy = 0;
                    for (i = 0; i < ns.length; i++) { gx += ns[i].x; gy += ns[i].y; }
                    gx /= ns.length; gy /= ns.length;
                    for (i = 0; i < ns.length; i++) {
                        ns[i].x = gx + (ns[i].x - gx) * g;
                        ns[i].y = gy + (ns[i].y - gy) * g;
                    }
                    for (i = 0; i < sp.length; i++) sp[i].rest *= g;
                    cl.scale *= g;
                }
            }
        }
        while (clusters.length < targetCount()) clusters.push(spawnCluster());
        if (clusters.length > targetCount()) clusters.length = targetCount();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        var c, i, t;
        ctx.strokeStyle = colors.edge;
        for (c = 0; c < clusters.length; c++) {
            var cl = clusters[c], ns = cl.nodes, ims = imagesFor(cl);
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            for (t = 0; t < ims.length; t++) {
                var T = ims[t];
                for (i = 0; i < cl.springs.length; i++) {
                    var s = cl.springs[i], a = ns[s.i], b = ns[s.j];
                    ctx.moveTo(apX(T, a.x, a.y), apY(T, a.x, a.y));
                    ctx.lineTo(apX(T, b.x, b.y), apY(T, b.x, b.y));
                }
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = colors.node;
        for (c = 0; c < clusters.length; c++) {
            var cl2 = clusters[c], ns2 = cl2.nodes, ims2 = imagesFor(cl2);
            for (t = 0; t < ims2.length; t++) {
                var T2 = ims2[t];
                for (i = 0; i < ns2.length; i++) {
                    ctx.beginPath();
                    ctx.arc(apX(T2, ns2[i].x, ns2[i].y), apY(T2, ns2[i].x, ns2[i].y), 1.4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    if (reduced) { draw(); return; }
    function frame() {
        if (!document.hidden && W > 0) { step(); draw(); }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
