(function() {
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

    // notes.json entries are either a one-off note { slug, title, date } with its
    // file at notebook/<slug>.md, or a topic { topic, title, notes: [...] } whose
    // notes live at notebook/<topic>/<slug>.md and route as #notebook/<topic>/<slug>.
    function noteRow(path, title, date) {
        return '<p class="note-row"><span class="note-date">' + (date || '') +
            '</span> <a href="#notebook/' + path + '">' + title + '</a></p>';
    }
    function findNote(entries, path) {
        var found = null;
        entries.forEach(function(e) {
            if (e.notes) {
                e.notes.forEach(function(n) {
                    if (e.topic + '/' + n.slug === path) found = n;
                });
            } else if (e.slug === path) {
                found = e;
            }
        });
        return found;
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
        getNotes().then(function(entries) {
            if (!slug) {
                if (!entries.length) {
                    container.innerHTML = '<p>No notes yet.</p>';
                    return;
                }
                // Newest first everywhere: notes within a topic sort by date, and a
                // topic sorts against one-off notes by its most recent note's date.
                function entryDate(e) {
                    if (!e.notes) return e.date || '';
                    return e.notes.reduce(function(max, n) {
                        return (n.date || '') > max ? n.date : max;
                    }, '');
                }
                function byDateDesc(a, b) {
                    var da = entryDate(a), db = entryDate(b);
                    return da === db ? 0 : (da < db ? 1 : -1);
                }
                container.innerHTML = entries.slice().sort(byDateDesc).map(function(e) {
                    if (e.notes) {
                        var open = !!expandedTopics[e.topic];
                        return '<div class="note-topic' + (open ? '' : ' collapsed') + '" data-topic="' + e.topic + '">' +
                            '<p class="note-topic-title"><a href="#" class="note-topic-toggle">' +
                            '<span class="note-topic-caret">' + (open ? '&#9662;' : '&#9656;') + '</span> ' +
                            e.title + '/</a></p>' +
                            e.notes.slice().sort(byDateDesc).map(function(n) {
                                return noteRow(e.topic + '/' + n.slug, n.title, n.date);
                            }).join('') + '</div>';
                    }
                    return noteRow(e.slug, e.title, e.date);
                }).join('');
                container.querySelectorAll('.note-topic-toggle').forEach(function(t) {
                    t.addEventListener('click', function(ev) {
                        ev.preventDefault();
                        var topicEl = t.closest('.note-topic');
                        var open = !topicEl.classList.toggle('collapsed');
                        expandedTopics[topicEl.getAttribute('data-topic')] = open;
                        topicEl.querySelector('.note-topic-caret').innerHTML = open ? '&#9662;' : '&#9656;';
                    });
                });
                return;
            }
            var note = findNote(entries, slug);
            if (!note) {
                container.innerHTML = '<p>Note not found. <a href="#notebook">&larr; back to notebook</a></p>';
                return;
            }
            fetch('notebook/' + slug + '.md')
                .then(function(res) {
                    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
                    return res.text();
                })
                .then(function(md) {
                    container.innerHTML =
                        '<p class="note-back"><a href="#notebook">&larr; notebook</a></p>' +
                        '<div class="note-body">' + renderMarkdown(md) + '</div>';
                    drawSmiles(container);
                })
                .catch(function(err) {
                    container.innerHTML = '<p>Failed to load note (' + err.message + '). <a href="#notebook">&larr; back to notebook</a></p>';
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
