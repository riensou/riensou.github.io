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

    var darkBtn = document.getElementById('dark-mode-btn');
    var THEME_KEY = 'riensou-theme';
    function applyTheme(dark) {
        document.body.classList.toggle('dark-mode', dark);
        if (darkBtn) darkBtn.textContent = dark ? 'Light' : 'Dark';
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
})();
