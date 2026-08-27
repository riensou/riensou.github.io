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
