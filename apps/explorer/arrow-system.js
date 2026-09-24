(() => {
  const root = document.getElementById('arrowSystemIsland');
  const trigger = document.getElementById('arrowSystemTrigger');
  const content = document.getElementById('arrowSystemContent');
  const orbitLink = document.getElementById('arrowOrbitLink');
  if (!root || !trigger || !content) return;

  const ORBIT_URL = 'https://link9060.github.io/Resonant-Orbit/';
  let pinned = false;
  let launching = false;

  const clearOrbitSource = () => {
    const url = new URL(location.href);
    url.searchParams.delete('from');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const receiveFromOrbit = () => {
    const url = new URL(location.href);
    if (url.searchParams.get('from') !== 'orbit') return;

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      clearOrbitSource();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const overlay = document.createElement('div');
    overlay.className = 'arrow-system-arrival';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = [
      '<span class="arrow-system-arrival-ring ring-a" aria-hidden="true"></span>',
      '<span class="arrow-system-arrival-ring ring-b" aria-hidden="true"></span>',
      '<span class="arrow-system-arrival-craft" aria-hidden="true"><span></span></span>',
      '<p>Arriving in Atlas</p>',
    ].join('');

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = previousOverflow;
      clearOrbitSource();
    }, 1080);
  };

  const setOpen = (open) => {
    root.dataset.open = String(open);
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? 'Close ARROW controls' : 'Open ARROW controls');
    content.setAttribute('aria-hidden', String(!open));
  };

  root.addEventListener('mouseenter', () => setOpen(true));
  root.addEventListener('mouseleave', () => {
    if (!pinned) setOpen(false);
  });
  root.addEventListener('focusin', () => setOpen(true));
  root.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!pinned && !root.contains(document.activeElement)) setOpen(false);
    });
  });

  trigger.addEventListener('click', () => {
    pinned = !pinned;
    root.dataset.pinned = String(pinned);
    setOpen(pinned || root.dataset.open !== 'true');
  });

  document.addEventListener('pointerdown', (event) => {
    if (root.contains(event.target)) return;
    pinned = false;
    root.dataset.pinned = 'false';
    setOpen(false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    pinned = false;
    root.dataset.pinned = 'false';
    setOpen(false);
    trigger.focus({ preventScroll: true });
  });

  orbitLink?.addEventListener('click', (event) => {
    if (launching) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    launching = true;

    const destination = new URL(ORBIT_URL);
    destination.searchParams.set('from', 'atlas');

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      location.assign(destination.toString());
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'arrow-system-launch';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = [
      '<span class="arrow-system-launch-ring ring-a" aria-hidden="true"></span>',
      '<span class="arrow-system-launch-ring ring-b" aria-hidden="true"></span>',
      '<span class="arrow-system-launch-craft" aria-hidden="true"><span></span></span>',
      '<p>Returning to Orbit</p>',
    ].join('');

    document.body.appendChild(overlay);
    setTimeout(() => location.assign(destination.toString()), 980);
  });
  receiveFromOrbit();
})();
