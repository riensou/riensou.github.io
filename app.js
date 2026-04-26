(function() {
    var panels = document.querySelectorAll('.main .panel');
    var links = document.querySelectorAll('.nav-link');
    var sidebar = document.getElementById('sidebar');
    function show(sectionId) {
        var id = sectionId + '-panel';
        panels.forEach(function(p) {
            p.classList.toggle('active', p.id === id);
        });
        links.forEach(function(a) {
            a.classList.toggle('active', a.getAttribute('data-section') === sectionId);
        });
        if (sidebar) {
            sidebar.classList.toggle('sidebar--music', sectionId === 'music');
        }
        if (history.replaceState) history.replaceState(null, '', '#' + sectionId);
        if (typeof cursor !== 'undefined') {
            cursor.mode = 'nav';
            cursor.idx = 0;
        }
        if (typeof desiredX !== 'undefined') desiredX = null;
        if (typeof pending !== 'undefined') pending = null;
        if (typeof searchMatches !== 'undefined') searchMatches = [];
        document.querySelectorAll('.ch.cursor-on').forEach(function(el) {
            el.classList.remove('cursor-on');
        });
        document.querySelectorAll('.ch.search-match').forEach(function(el) {
            el.classList.remove('search-match');
        });
    }
    function getSection() {
        var hash = (window.location.hash || '#about').slice(1);
        return hash && document.getElementById(hash + '-panel') ? hash : 'about';
    }
    links.forEach(function(a) {
        a.addEventListener('click', function(e) {
            e.preventDefault();
            show(a.getAttribute('data-section'));
        });
    });
    window.addEventListener('hashchange', function() { show(getSection()); });
    show(getSection());

    var sections = Array.prototype.map.call(links, function(a) {
        return a.getAttribute('data-section');
    });

    // ============ Char-level wrap ============
    function wrapCharsIn(root) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                var p = node.parentElement;
                while (p && p !== root) {
                    if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
                    if (p.classList && p.classList.contains('ch')) return NodeFilter.FILTER_REJECT;
                    p = p.parentElement;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        var textNodes = [];
        var n;
        while ((n = walker.nextNode())) textNodes.push(n);
        textNodes.forEach(function(textNode) {
            var frag = document.createDocumentFragment();
            var text = textNode.nodeValue;
            var i = 0;
            while (i < text.length) {
                if (/\s/.test(text[i])) {
                    var j = i;
                    while (j < text.length && /\s/.test(text[j])) j++;
                    var gap = document.createElement('span');
                    gap.className = 'ch ws';
                    gap.textContent = ' ';
                    frag.appendChild(gap);
                    i = j;
                } else {
                    var span = document.createElement('span');
                    span.className = 'ch';
                    span.textContent = text[i];
                    frag.appendChild(span);
                    i++;
                }
            }
            textNode.parentNode.replaceChild(frag, textNode);
        });
    }
    document.querySelectorAll('.panel-content .meta').forEach(function(el) {
        var p = document.createElement('span');
        p.className = 'meta-prefix';
        p.textContent = '# ';
        el.insertBefore(p, el.firstChild);
    });
    document.querySelectorAll('.panel-content .contact-email').forEach(function(el) {
        var p = document.createElement('span');
        p.className = 'meta-prefix';
        p.textContent = 'email:    ';
        el.insertBefore(p, el.firstChild);
    });
    document.querySelectorAll('.panel .panel-content').forEach(wrapCharsIn);

    // ============ State ============
    var cursor = { mode: 'nav', idx: 0 };
    var desiredX = null;
    var pending = null;       // { type: 'g' | 'f' | 'F' | 't' | 'T' }
    var lastFind = null;      // { ch, direction, inclusive }
    var searchMatches = [];
    var inputMode = null;     // null | 'command' | 'search'
    var inputBuffer = '';
    var statusEl = document.getElementById('vim-status');
    var helpEl = document.getElementById('vim-help');

    // ============ Char helpers ============
    function getChars() {
        var panel = document.querySelector('.panel.active');
        return panel ? Array.prototype.slice.call(panel.querySelectorAll('.ch')) : [];
    }
    function isWs(el) { return el.classList.contains('ws'); }
    function isWordStart(cs, i) {
        if (isWs(cs[i])) return false;
        if (i === 0) return true;
        if (isWs(cs[i - 1])) return true;
        return cs[i - 1].nextSibling !== cs[i];
    }
    function isWordEnd(cs, i) {
        if (isWs(cs[i])) return false;
        if (i === cs.length - 1) return true;
        if (isWs(cs[i + 1])) return true;
        return cs[i].nextSibling !== cs[i + 1];
    }
    function rectTop(el) { return el.getBoundingClientRect().top; }
    function rectCenterX(el) {
        var r = el.getBoundingClientRect();
        return r.left + r.width / 2;
    }
    function sameLine(a, b) {
        var ra = a.getBoundingClientRect();
        var rb = b.getBoundingClientRect();
        var overlap = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        return overlap > Math.min(ra.height, rb.height) * 0.5;
    }
    function lineStart(cs, i) {
        var j = i;
        while (j > 0 && sameLine(cs[j - 1], cs[i])) j--;
        return j;
    }
    function lineEnd(cs, i) {
        var j = i;
        while (j < cs.length - 1 && sameLine(cs[j + 1], cs[i])) j++;
        return j;
    }
    function moveLine(direction) {
        var cs = getChars();
        if (!cs.length) return -1;
        var curRect = cs[cursor.idx].getBoundingClientRect();
        var curMidY = curRect.top + curRect.height / 2;
        var threshold = curRect.height * 0.6;
        var candidates = [];
        for (var i = 0; i < cs.length; i++) {
            if (i === cursor.idx) continue;
            var r = cs[i].getBoundingClientRect();
            var midY = r.top + r.height / 2;
            var dy = midY - curMidY;
            if (direction > 0 && dy < threshold) continue;
            if (direction < 0 && dy > -threshold) continue;
            candidates.push({ idx: i, dy: dy, midX: r.left + r.width / 2, h: r.height });
        }
        if (!candidates.length) return -1;
        candidates.sort(function(a, b) { return Math.abs(a.dy) - Math.abs(b.dy); });
        var targetDy = candidates[0].dy;
        var rowThreshold = Math.max(threshold, candidates[0].h * 0.6);
        var best = candidates[0];
        for (var k = 0; k < candidates.length; k++) {
            var c = candidates[k];
            if (Math.abs(c.dy - targetDy) > rowThreshold) continue;
            if (Math.abs(c.midX - desiredX) < Math.abs(best.midX - desiredX)) best = c;
        }
        return best.idx;
    }
    function nextWordStart(i) {
        var cs = getChars();
        var j = i + 1;
        while (j < cs.length && !isWordStart(cs, j)) j++;
        return j < cs.length ? j : -1;
    }
    function prevWordStart(i) {
        var cs = getChars();
        for (var j = i - 1; j >= 0; j--) {
            if (isWordStart(cs, j)) return j;
        }
        return -1;
    }
    function nextWordEnd(i) {
        var cs = getChars();
        for (var j = i + 1; j < cs.length; j++) {
            if (isWordEnd(cs, j)) return j;
        }
        return -1;
    }
    function pageMove(direction, fraction) {
        var cs = getChars();
        if (!cs.length) return -1;
        var refTop;
        if (cursor.mode === 'content' && cursor.idx >= 0 && cursor.idx < cs.length) {
            refTop = rectTop(cs[cursor.idx]);
        } else {
            refTop = window.innerHeight / 2;
        }
        var targetTop = refTop + direction * window.innerHeight * fraction;
        var best = 0, bestDist = Infinity;
        for (var i = 0; i < cs.length; i++) {
            var d = Math.abs(rectTop(cs[i]) - targetTop);
            if (d < bestDist) { bestDist = d; best = i; }
        }
        return best;
    }
    function halfPage(direction) { return pageMove(direction, 0.5); }
    function fullPage(direction) { return pageMove(direction, 0.9); }
    function findCharOnLine(ch, direction, inclusive) {
        var cs = getChars();
        var cur = cs[cursor.idx];
        var curTop = rectTop(cur);
        var i = cursor.idx + direction;
        while (direction > 0 ? i < cs.length : i >= 0) {
            if (Math.abs(rectTop(cs[i]) - curTop) > 1) break;
            if (cs[i].textContent === ch) {
                return inclusive ? i : i - direction;
            }
            i += direction;
        }
        return -1;
    }

    // ============ Cursor rendering ============
    function renderCursor() {
        document.querySelectorAll('.ch.cursor-on').forEach(function(el) {
            el.classList.remove('cursor-on');
        });
        if (cursor.mode !== 'content') return;
        var cs = getChars();
        if (!cs.length) { cursor.mode = 'nav'; return; }
        if (cursor.idx >= cs.length) cursor.idx = cs.length - 1;
        if (cursor.idx < 0) cursor.idx = 0;
        var c = cs[cursor.idx];
        c.classList.add('cursor-on');
        c.scrollIntoView({ block: 'nearest' });
    }

    // ============ Search ============
    function clearSearchHighlights() {
        document.querySelectorAll('.ch.search-match').forEach(function(el) {
            el.classList.remove('search-match');
        });
    }
    function computeSearchMatches(pattern) {
        clearSearchHighlights();
        searchMatches = [];
        if (!pattern) return;
        var cs = getChars();
        if (!cs.length) return;
        var parts = [], positions = [];
        for (var i = 0; i < cs.length; i++) {
            if (i > 0 && cs[i - 1].nextSibling !== cs[i]) {
                parts.push(' ');
                positions.push(-1);
            }
            parts.push(cs[i].textContent);
            positions.push(i);
        }
        var text = parts.join('').toLowerCase();
        var lp = pattern.toLowerCase();
        var s = 0;
        while (true) {
            var k = text.indexOf(lp, s);
            if (k === -1) break;
            var startI = -1, endI = -1;
            for (var p = k; p < k + lp.length; p++) {
                if (positions[p] >= 0) {
                    if (startI === -1) startI = positions[p];
                    endI = positions[p];
                }
            }
            if (startI !== -1) searchMatches.push([startI, endI]);
            s = k + 1;
        }
        searchMatches.forEach(function(pair) {
            for (var i = pair[0]; i <= pair[1]; i++) {
                cs[i].classList.add('search-match');
            }
        });
    }
    function jumpToMatch(fromIdx, direction) {
        if (!searchMatches.length) return -1;
        if (direction > 0) {
            for (var i = 0; i < searchMatches.length; i++) {
                if (searchMatches[i][0] > fromIdx) return searchMatches[i][0];
            }
            return searchMatches[0][0];
        } else {
            for (var j = searchMatches.length - 1; j >= 0; j--) {
                if (searchMatches[j][0] < fromIdx) return searchMatches[j][0];
            }
            return searchMatches[searchMatches.length - 1][0];
        }
    }

    // ============ Status bar ============
    function renderStatus() {
        if (!inputMode) { statusEl.classList.add('hidden'); statusEl.textContent = ''; return; }
        statusEl.classList.remove('hidden');
        statusEl.innerHTML = '';
        var prefix = document.createElement('span');
        prefix.className = 'vs-prefix';
        prefix.textContent = inputMode === 'command' ? ':' : '/';
        var body = document.createTextNode(inputBuffer);
        var caret = document.createElement('span');
        caret.className = 'vs-caret';
        caret.textContent = ' ';
        statusEl.appendChild(prefix);
        statusEl.appendChild(body);
        statusEl.appendChild(caret);
    }
    function startInput(mode) {
        inputMode = mode;
        inputBuffer = '';
        renderStatus();
    }
    function endInput() {
        inputMode = null;
        inputBuffer = '';
        renderStatus();
    }

    // ============ Command execution ============
    function runCommand(raw) {
        var cmd = raw.trim().toLowerCase();
        if (!cmd) return;
        if (sections.indexOf(cmd) >= 0) { show(cmd); return; }
        if (cmd === 'dark') { setDarkMode(true); return; }
        if (cmd === 'light') { setDarkMode(false); return; }
        if (cmd === 'help' || cmd === 'h' || cmd === '?') { showHelp(); return; }
    }
    function showHelp() { helpEl.classList.remove('hidden'); }
    function hideHelp() { helpEl.classList.add('hidden'); }

    // ============ Input-mode keydown ============
    function handleInputKey(e) {
        var key = e.key;
        if (key === 'Escape') {
            if (inputMode === 'search') { clearSearchHighlights(); searchMatches = []; }
            endInput();
            return;
        }
        if (key === 'Enter') {
            if (inputMode === 'command') {
                runCommand(inputBuffer);
                endInput();
            } else {
                endInput();
                if (searchMatches.length) {
                    var fromI = cursor.mode === 'content' ? cursor.idx - 1 : -1;
                    var ni = jumpToMatch(fromI, 1);
                    if (ni >= 0) {
                        cursor.mode = 'content';
                        cursor.idx = ni;
                        desiredX = null;
                        renderCursor();
                    }
                }
            }
            return;
        }
        if (key === 'Backspace') {
            inputBuffer = inputBuffer.slice(0, -1);
            if (inputMode === 'search') computeSearchMatches(inputBuffer);
            renderStatus();
            return;
        }
        if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            inputBuffer += key;
            if (inputMode === 'search') computeSearchMatches(inputBuffer);
            renderStatus();
        }
    }

    // ============ Normal mode keydown ============
    function handleNormalKey(e) {
        var key = e.key;

        // Pending chord handling (g, f/F/t/T)
        if (pending) {
            e.preventDefault();
            var p = pending;
            pending = null;
            if (p.type === 'g') {
                if (key === 'g') {
                    if (getChars().length) {
                        cursor.mode = 'content';
                        cursor.idx = 0;
                        desiredX = null;
                        renderCursor();
                    }
                }
                return;
            }
            if (p.type === 'f' || p.type === 'F' || p.type === 't' || p.type === 'T') {
                if (key.length !== 1 || key === 'Shift' || key === 'Control') return;
                var dir = (p.type === 'f' || p.type === 't') ? 1 : -1;
                var inclusive = (p.type === 'f' || p.type === 'F');
                var ni = findCharOnLine(key, dir, inclusive);
                if (ni >= 0) {
                    cursor.mode = 'content';
                    cursor.idx = ni;
                    desiredX = null;
                    lastFind = { ch: key, direction: dir, inclusive: inclusive };
                    renderCursor();
                }
                return;
            }
        }

        // Global: start-of-command keys, work in any mode
        if (key === ':') { e.preventDefault(); startInput('command'); return; }
        if (key === '/') { e.preventDefault(); startInput('search'); return; }
        if (key === '?') { e.preventDefault(); showHelp(); return; }

        // Ctrl-d/u/f/b (allow; block other ctrl combos)
        if (e.ctrlKey) {
            if (key === 'd' || key === 'u') {
                e.preventDefault();
                var ni = halfPage(key === 'd' ? 1 : -1);
                if (cursor.mode === 'nav') cursor.mode = 'content';
                cursor.idx = ni; desiredX = null; renderCursor();
                return;
            }
            if (key === 'f' || key === 'b') {
                e.preventDefault();
                var ni2 = fullPage(key === 'f' ? 1 : -1);
                if (cursor.mode === 'nav') cursor.mode = 'content';
                cursor.idx = ni2; desiredX = null; renderCursor();
                return;
            }
            return;
        }

        if (cursor.mode === 'nav') {
            if (key === 'l' || key === 'ArrowRight') {
                e.preventDefault();
                var idx = sections.indexOf(getSection()); if (idx === -1) idx = 0;
                show(sections[(idx + 1) % sections.length]);
                return;
            }
            if (key === 'h' || key === 'ArrowLeft') {
                e.preventDefault();
                var idx = sections.indexOf(getSection()); if (idx === -1) idx = 0;
                show(sections[(idx - 1 + sections.length) % sections.length]);
                return;
            }
            if (key === 'j' || key === 'ArrowDown') {
                e.preventDefault();
                if (getChars().length) {
                    cursor.mode = 'content'; cursor.idx = 0; desiredX = null;
                    renderCursor();
                }
                return;
            }
            if (key === 'g') { e.preventDefault(); pending = { type: 'g' }; return; }
            if (key === 'G') {
                e.preventDefault();
                var cs = getChars();
                if (cs.length) {
                    cursor.mode = 'content'; cursor.idx = cs.length - 1; desiredX = null;
                    renderCursor();
                }
                return;
            }
            if (key === 'n' || key === 'N') {
                e.preventDefault();
                if (!searchMatches.length) return;
                var ni3 = jumpToMatch(-1, key === 'n' ? 1 : -1);
                if (ni3 >= 0) {
                    cursor.mode = 'content'; cursor.idx = ni3; desiredX = null;
                    renderCursor();
                }
                return;
            }
            return;
        }

        // Content mode
        if (key === 'Escape') {
            e.preventDefault();
            cursor.mode = 'nav'; cursor.idx = 0; desiredX = null;
            renderCursor();
            return;
        }
        if (key === 'h' || key === 'ArrowLeft') {
            e.preventDefault();
            if (cursor.idx > 0) cursor.idx--;
            desiredX = null; renderCursor();
            return;
        }
        if (key === 'l' || key === 'ArrowRight') {
            e.preventDefault();
            var cs = getChars();
            if (cursor.idx < cs.length - 1) cursor.idx++;
            desiredX = null; renderCursor();
            return;
        }
        if (key === 'j' || key === 'ArrowDown') {
            e.preventDefault();
            var cs = getChars();
            if (desiredX === null) desiredX = rectCenterX(cs[cursor.idx]);
            var ni = moveLine(1);
            if (ni >= 0) { cursor.idx = ni; renderCursor(); }
            return;
        }
        if (key === 'k' || key === 'ArrowUp') {
            e.preventDefault();
            var cs = getChars();
            if (desiredX === null) desiredX = rectCenterX(cs[cursor.idx]);
            var ni = moveLine(-1);
            if (ni >= 0) { cursor.idx = ni; renderCursor(); }
            else {
                cursor.mode = 'nav'; cursor.idx = 0; desiredX = null;
                renderCursor();
            }
            return;
        }
        if (key === 'w') {
            e.preventDefault();
            var ni = nextWordStart(cursor.idx);
            if (ni >= 0) { cursor.idx = ni; desiredX = null; renderCursor(); }
            return;
        }
        if (key === 'b') {
            e.preventDefault();
            var ni = prevWordStart(cursor.idx);
            if (ni >= 0) { cursor.idx = ni; desiredX = null; renderCursor(); }
            return;
        }
        if (key === 'e') {
            e.preventDefault();
            var ni = nextWordEnd(cursor.idx);
            if (ni >= 0) { cursor.idx = ni; desiredX = null; renderCursor(); }
            return;
        }
        if (key === '0') {
            e.preventDefault();
            var cs = getChars();
            cursor.idx = lineStart(cs, cursor.idx);
            desiredX = null; renderCursor();
            return;
        }
        if (key === '$') {
            e.preventDefault();
            var cs = getChars();
            cursor.idx = lineEnd(cs, cursor.idx);
            desiredX = null; renderCursor();
            return;
        }
        if (key === 'g') { e.preventDefault(); pending = { type: 'g' }; return; }
        if (key === 'G') {
            e.preventDefault();
            var cs = getChars();
            cursor.idx = cs.length - 1; desiredX = null; renderCursor();
            return;
        }
        if (key === 'f' || key === 'F' || key === 't' || key === 'T') {
            e.preventDefault();
            pending = { type: key };
            return;
        }
        if (key === ';') {
            e.preventDefault();
            if (lastFind) {
                var ni = findCharOnLine(lastFind.ch, lastFind.direction, lastFind.inclusive);
                if (ni >= 0) { cursor.idx = ni; desiredX = null; renderCursor(); }
            }
            return;
        }
        if (key === ',') {
            e.preventDefault();
            if (lastFind) {
                var ni = findCharOnLine(lastFind.ch, -lastFind.direction, lastFind.inclusive);
                if (ni >= 0) { cursor.idx = ni; desiredX = null; renderCursor(); }
            }
            return;
        }
        if (key === 'n' || key === 'N') {
            e.preventDefault();
            if (!searchMatches.length) return;
            var ni = jumpToMatch(cursor.idx, key === 'n' ? 1 : -1);
            if (ni >= 0) { cursor.idx = ni; desiredX = null; renderCursor(); }
            return;
        }
    }

    // ============ Dispatcher ============
    document.addEventListener('keydown', function(e) {
        if (e.metaKey || e.altKey) return;
        var t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        if (!helpEl.classList.contains('hidden')) {
            e.preventDefault();
            hideHelp();
            return;
        }
        if (inputMode) {
            e.preventDefault();
            handleInputKey(e);
            return;
        }
        handleNormalKey(e);
    });
    helpEl.addEventListener('click', hideHelp);

    var darkBtn = document.getElementById('dark-mode-btn');
    var DARK_KEY = 'riensou-dark-mode';
    function setDarkMode(on) {
        document.body.classList.toggle('dark-mode', on);
        if (darkBtn) darkBtn.textContent = on ? 'Light' : 'Dark';
        try { localStorage.setItem(DARK_KEY, on ? '1' : '0'); } catch (e) {}
    }
    if (darkBtn) {
        darkBtn.addEventListener('click', function() {
            setDarkMode(!document.body.classList.contains('dark-mode'));
        });
    }
    try {
        if (localStorage.getItem(DARK_KEY) === '1') setDarkMode(true);
        else setDarkMode(false);
    } catch (e) {}
})();
