(() => {
    const prefix = '/evophys';
    const current = window.location;
    if (current.pathname !== prefix && !current.pathname.startsWith(prefix + '/')) {
        return;
    }

    // Assign the pathname separately so a leading // cannot change the host.
    const target = new URL('https://evophys.com/');
    target.pathname = current.pathname.slice(prefix.length) || '/';
    target.search = current.search;
    target.hash = current.hash;
    current.replace(target.href);
})();
