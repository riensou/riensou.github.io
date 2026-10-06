(function() {
    // Heavy note-rendering libraries (KaTeX + mhchem, marked, smiles-drawer)
    // load lazily: the landing page never pays for them. They prefetch in the
    // background once the page is idle, so by the time a note is opened they
    // are almost always already in cache.
    var libsPromise = null;
    function loadScript(src) {
        return new Promise(function(resolve, reject) {
            var sc = document.createElement('script');
            sc.src = src; sc.onload = resolve; sc.onerror = reject;
            document.head.appendChild(sc);
        });
    }
    function loadCss(href) {
        return new Promise(function(resolve) {
            var l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = href;
            l.onload = resolve; l.onerror = resolve;
            document.head.appendChild(l);
        });
    }
    function loadLibs() {
        if (!libsPromise) {
            libsPromise = Promise.all([
                loadCss('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css'),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.js')
                    .then(function() { return loadScript('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/contrib/mhchem.min.js'); }),
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js'),
                loadScript('https://cdn.jsdelivr.net/npm/smiles-drawer@2.1.7/dist/smiles-drawer.min.js').catch(function() {})
            ]);
        }
        return libsPromise;
    }
    window.addEventListener('load', function() {
        var warm = function() { loadLibs(); };
        if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 4000 });
        else setTimeout(warm, 1500);
    });

    // Each .panel-content with a data-src attribute is filled from its section
    // file in sections/ before the rest of the page logic runs.
    function loadSections() {
        var slots = Array.prototype.slice.call(document.querySelectorAll('.panel-content[data-src]'));
        return Promise.all(slots.map(function(el) {
            return fetch(el.getAttribute('data-src'))
                .then(function(res) {
                    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
                    return res.text();
                })
                .then(function(html) { el.innerHTML = html; })
                .catch(function(err) {
                    el.innerHTML = '<p>Failed to load section (' + err.message + '). If viewing via file://, run a local server instead.</p>';
                });
        }));
    }

    // Notebook: notes live as markdown files in notebook/, listed in notebook/notes.json.
    // #notebook shows the list; #notebook/<slug> shows one note.
    var notesPromise = null;
    function getNotes() {
        if (!notesPromise) {
            notesPromise = fetch('notebook/notes.json')
                .then(function(res) {
                    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
                    return res.json();
                })
                .catch(function() { return []; });
        }
        return notesPromise;
    }
    // Markdown + LaTeX: $...$ inline, $$...$$ display. Math is stashed before
    // marked runs (so underscores etc. survive markdown parsing), rendered with
    // KaTeX, and spliced back in afterwards. Code spans/fences are left untouched.
    function renderMarkdown(md) {
        var stash = [];
        function stashMath(tex, display) {
            var html;
            try {
                html = katex.renderToString(tex, { displayMode: display, throwOnError: false });
            } catch (e) {
                html = tex;
            }
            stash.push(html);
            return '@@MATH' + (stash.length - 1) + '@@';
        }
        // Split out code fences and inline code; only scan the segments between them.
        var parts = md.split(/(```[\s\S]*?```|`[^`\n]*`)/);
        // A fence tagged `smiles` becomes molecule drawings (one per line),
        // rendered onto canvases by drawSmiles() after the HTML is inserted.
        for (var i = 1; i < parts.length; i += 2) {
            // A fence tagged `figure` names a folder under assets/figures/;
            // its fig.html fragment is fetched and spliced in by loadFigures()
            var fg = parts[i].match(/^```figure[ \t]*\n([\s\S]*?)```$/);
            if (fg) {
                var figPath = fg[1].trim().replace(/\/+$/, '');
                stash.push('<div class="note-figure" data-fig="' + figPath + '"></div>');
                parts[i] = '@@MATH' + (stash.length - 1) + '@@';
                continue;
            }
            var sm = parts[i].match(/^```smiles[ \t]*\n([\s\S]*?)```$/);
            if (sm) {
                var fig = '<div class="smiles-fig">' + sm[1].split('\n').filter(function(l) {
                    return l.trim();
                }).map(function(l) {
                    return '<img class="smiles-img" data-smiles="' + l.trim() + '" alt="' + l.trim() + '">';
                }).join('') + '</div>';
                stash.push(fig);
                parts[i] = '@@MATH' + (stash.length - 1) + '@@';
            }
        }
        for (var i = 0; i < parts.length; i += 2) {
            parts[i] = parts[i]
                .replace(/\\\$/g, '@@DOLLAR@@')
                .replace(/\$\$([\s\S]+?)\$\$/g, function(_, tex) { return stashMath(tex, true); })
                .replace(/\$([^\$\n]+?)\$/g, function(_, tex) { return stashMath(tex, false); })
                .replace(/@@DOLLAR@@/g, '$$');
        }
        var html = marked.parse(parts.join(''));
        return html.replace(/@@MATH(\d+)@@/g, function(_, i) { return stash[+i]; });
    }

    // notes.json entries are either a note { slug, title, date } or a topic
    // { topic, title, notes: [...] } whose notes array may itself contain both
    // notes and nested topics, to any depth. Files mirror the nesting: a note's
    // .md lives at notebook/<topic path>/<slug>.md and routes as
    // #notebook/<topic path>/<slug>, e.g. notebook/chemistry/organic/alkenes.md.
    function noteRow(path, title, date, treePrefix) {
        return '<p class="note-row"><span class="note-tree">' + treePrefix + '</span>' +
            '<span class="note-label"><a href="#notebook/' + path + '">' + title + '</a>' +
            (date ? '<span class="note-date">  ' + date + '</span>' : '') + '</span></p>';
    }
    function findNote(entries, path) {
        var found = null;
        entries.forEach(function(e) {
            if (found) return;
            if (e.notes) {
                var prefix = e.topic + '/';
                if (path.indexOf(prefix) === 0) found = findNote(e.notes, path.slice(prefix.length));
            } else if (e.slug === path) {
                found = e;
            }
        });
        return found;
    }
    // Fetch each figure fragment and splice it in, rendering any $...$
    // labels with KaTeX directly (no markdown pass needed inside figures).
    function loadFigures(root) {
        root.querySelectorAll('.note-figure[data-fig]').forEach(function(el) {
            var path = el.getAttribute('data-fig');
            fetch(path + '/fig.html')
                .then(function(res) {
                    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
                    return res.text();
                })
                .then(function(html) {
                    el.innerHTML = html.replace(/\$([^$\n]+?)\$/g, function(_, tex) {
                        try {
                            return katex.renderToString(tex, { throwOnError: false });
                        } catch (e) { return tex; }
                    });
                })
                .catch(function(err) {
                    el.innerHTML = '<p class="note-date">figure failed to load: ' + path + ' (' + err.message + ')</p>';
                });
        });
    }

    // Render every img[data-smiles] under root with smiles-drawer (its draw()
    // fills an img element with the structure), matching the current theme.
    // Falls back to showing the SMILES text if the lib is missing or parsing fails.
    function drawSmiles(root) {
        var theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        root.querySelectorAll('img[data-smiles]').forEach(function(el) {
            var smiles = el.getAttribute('data-smiles');
            if (typeof SmiDrawer === 'undefined') {
                el.outerHTML = '<code>' + smiles + '</code>';
                return;
            }
            new SmiDrawer({ compactDrawing: false }).draw(smiles, el, theme, null, function(err) {
                el.outerHTML = '<code>' + smiles + '</code>';
            });
        });
    }

    // Topics render collapsed; clicking a topic title reveals its notes in place.
    // Remembered per visit so the list keeps its state as you navigate around.
    var expandedTopics = {};
    function renderNotebook(slug) {
        var container = document.querySelector('#notebook-panel .panel-content');
        if (!container) return;
        // Clear immediately when opening a note so the list (or a previous
        // note) doesn't linger while the markdown fetches.
        if (slug) container.innerHTML = '';
        getNotes().then(function(entries) {
            if (!slug) {
                if (!entries.length) {
                    container.innerHTML = '<p>No notes yet.</p>';
                    return;
                }
                // Newest first everywhere: a topic sorts against its siblings by
                // the most recent note anywhere in its subtree.
                // "tbd" (any case) is a valid date value: displayed as-is, but
                // sorted as if undated (oldest), so planned notes sink to the
                // bottom of their folder instead of floating to the top.
                function entryDate(e) {
                    if (!e.notes) {
                        var d = e.date || '';
                        return d.toLowerCase() === 'tbd' ? '' : d;
                    }
                    return e.notes.reduce(function(max, n) {
                        var d = entryDate(n);
                        return d > max ? d : max;
                    }, '');
                }
                function byDateDesc(a, b) {
                    var da = entryDate(a), db = entryDate(b);
                    return da === db ? 0 : (da < db ? 1 : -1);
                }
                // Rendered as a file tree: box-drawing connectors, folders named
                // with a trailing slash. Clicking a folder still toggles it.
                function renderEntries(list, pathPrefix, treePrefix, top) {
                    var sorted = list.slice().sort(byDateDesc);
                    return sorted.map(function(e, i) {
                        var last = i === sorted.length - 1;
                        var connector = top ? '' : treePrefix + (last ? '└── ' : '├── ');
                        var childPrefix = top ? '' : treePrefix + (last ? '    ' : '│   ');
                        if (e.notes) {
                            var path = pathPrefix + e.topic;
                            var open = !!expandedTopics[path];
                            return '<div class="note-topic' + (open ? '' : ' collapsed') + '" data-topic="' + path + '">' +
                                '<p class="note-row"><span class="note-tree">' + connector + '</span>' +
                                '<span class="note-label"><a href="#" class="note-topic-toggle">' + e.title + '/</a></span></p>' +
                                '<div class="note-topic-children">' +
                                renderEntries(e.notes, path + '/', childPrefix) + '</div></div>';
                        }
                        return noteRow(pathPrefix + e.slug, e.title, e.date, connector);
                    }).join('');
                }
                container.innerHTML = renderEntries(entries, '', '', true);
                container.querySelectorAll('.note-topic-toggle').forEach(function(t) {
                    t.addEventListener('click', function(ev) {
                        ev.preventDefault();
                        var topicEl = t.closest('.note-topic');
                        var open = !topicEl.classList.toggle('collapsed');
                        expandedTopics[topicEl.getAttribute('data-topic')] = open;
                    });
                });
                return;
            }
            var note = findNote(entries, slug);
            if (!note) {
                container.innerHTML = '<p>Note not found. <a href="#notebook">../</a></p>';
                return;
            }
            Promise.all([
                fetch('notebook/' + slug + '.md').then(function(res) {
                    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
                    return res.text();
                }),
                loadLibs()
            ])
                .then(function(both) {
                    var md = both[0];
                    container.innerHTML =
                        '<p class="note-back"><a href="#notebook">../</a></p>' +
                        '<div class="note-body">' + renderMarkdown(md) + '</div>';
                    drawSmiles(container);
                    loadFigures(container);
                })
                .catch(function(err) {
                    container.innerHTML = '<p>Failed to load note (' + err.message + '). <a href="#notebook">../</a></p>';
                });
        });
    }

    function init() {
        var panels = document.querySelectorAll('.main .panel');
        var links = document.querySelectorAll('.nav-link');
        var sidebar = document.getElementById('sidebar');
        function show(sectionId, sub) {
            var id = sectionId + '-panel';
            panels.forEach(function(p) {
                p.classList.toggle('active', p.id === id);
            });
            links.forEach(function(a) {
                a.classList.toggle('active', a.getAttribute('data-section') === sectionId);
            });
            if (sidebar) {
                sidebar.classList.toggle('sidebar--music', sectionId === 'music');
                sidebar.classList.toggle('sidebar--contact', sectionId === 'contact');
            }
            document.body.classList.toggle('no-sidebar', sectionId === 'notebook');
            document.documentElement.classList.toggle('no-scroll', sectionId !== 'notebook');
            document.body.classList.toggle('note-open', sectionId === 'notebook' && !!sub);
            if (sectionId === 'notebook') renderNotebook(sub);
            if (history.replaceState) history.replaceState(null, '', '#' + sectionId + (sub ? '/' + sub : ''));
        }
        function parseHash() {
            var hash = (window.location.hash || '#about').slice(1);
            var parts = hash.split('/');
            if (!document.getElementById(parts[0] + '-panel')) return { section: 'about', sub: '' };
            return { section: parts[0], sub: parts.slice(1).join('/') };
        }
        links.forEach(function(a) {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                show(a.getAttribute('data-section'), '');
            });
        });
        window.addEventListener('hashchange', function() {
            var h = parseHash();
            show(h.section, h.sub);
        });
        var h = parseHash();
        show(h.section, h.sub);

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
    }

    var darkBtn = document.getElementById('dark-mode-btn');
    var THEME_KEY = 'riensou-theme';

    // right-click the Light/Dark button to pick the accent color
    var ACCENTS = [
        ['red', '#c04848'], ['orange', '#c7822e'], ['yellow', '#c4b43c'],
        ['green', '#4ca64c'], ['blue', '#4a8ac4'], ['purple', '#9c6ac4']
    ];
    var accentMenu = null;
    function closeAccentMenu() {
        if (accentMenu) { accentMenu.remove(); accentMenu = null; }
        var gearBtn = document.getElementById('settings-btn');
        if (gearBtn) gearBtn.classList.remove('open');
        var controls = document.querySelector('.top-controls');
        if (controls) controls.classList.remove('open');
    }
    function openAccentMenu() {
        closeAccentMenu();
        accentMenu = document.createElement('div');
        accentMenu.className = 'accent-menu';
        // leftmost: toggle the background universe
        var ft = document.createElement('button');
        ft.type = 'button';
        ft.className = 'field-toggle' + (document.body.hasAttribute('data-field-off') ? ' off' : '');
        ft.title = 'background universe on/off';
        ft.textContent = '\u2234';
        ft.addEventListener('click', function() {
            var off = document.body.toggleAttribute('data-field-off');
            ft.classList.toggle('off', off);
            try {
                if (off) localStorage.removeItem('riensou-field');
                else localStorage.setItem('riensou-field', 'on');
            } catch (e) {}
        });
        accentMenu.appendChild(ft);
        var current = document.body.getAttribute('data-accent') || 'green';
        ACCENTS.forEach(function(a) {
            var b = document.createElement('button');
            b.type = 'button';
            b.title = a[0];
            if (a[0] === current) b.className = 'current';
            b.innerHTML = '<span class="swatch" style="background:' + a[1] + '"></span>';
            b.addEventListener('click', function() {
                if (a[0] === 'green') {
                    document.body.removeAttribute('data-accent');
                    try { localStorage.removeItem('riensou-accent'); } catch (e) {}
                } else {
                    document.body.setAttribute('data-accent', a[0]);
                    try { localStorage.setItem('riensou-accent', a[0]); } catch (e) {}
                }
                accentMenu.querySelectorAll('button').forEach(function(btn) {
                    if (!btn.classList.contains('field-toggle')) btn.classList.remove('current');
                });
                b.classList.add('current');
            });
            accentMenu.appendChild(b);
        });
        var controls = document.querySelector('.top-controls');
        var gearBtn = document.getElementById('settings-btn');
        if (controls) {
            controls.insertBefore(accentMenu, controls.firstChild);
            controls.classList.add('open');
        } else document.body.appendChild(accentMenu);
        if (gearBtn) gearBtn.classList.add('open');
    }
    var settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            if (accentMenu) closeAccentMenu();
            else openAccentMenu();
        });
        settingsBtn.title = 'accent color \u00b7 background universe';
    }
    if (darkBtn) {
        darkBtn.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if (accentMenu) closeAccentMenu();
            else openAccentMenu();
        });
    }
    document.addEventListener('mousedown', function(e) {
        if (accentMenu && !accentMenu.contains(e.target) && e.target !== darkBtn && e.target !== settingsBtn) closeAccentMenu();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeAccentMenu();
    });
    function applyTheme(dark) {
        document.body.classList.toggle('dark-mode', dark);
        if (darkBtn) darkBtn.textContent = dark ? 'Light' : 'Dark';
        drawSmiles(document);
    }
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    applyTheme(saved !== 'light');
    if (darkBtn) {
        darkBtn.addEventListener('click', function() {
            var dark = !document.body.classList.contains('dark-mode');
            applyTheme(dark);
            try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {}
        });
    }

    loadSections().then(init);
})();
