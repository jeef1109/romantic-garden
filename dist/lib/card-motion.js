/** Pointer-driven card motion, shared by CSS card surfaces and a Three.js scene.
 * Coordinates are normalized around the card's resting (untransformed) bounds.
 */
export function attachCardMotion(hitArea, render, {
  maxTilt = 10, response = 11, onActiveChange = () => {},
} = {}) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let desiredX = 0, desiredY = 0, x = 0, y = 0;
  let raf = 0, previous = 0, active = false, disposed = false;
  const clamp = n => Math.max(-1, Math.min(1, n));
  const draw = () => render({x, y, rotateX: -y * maxTilt, rotateY: x * maxTilt, active});
  const frame = time => {
    raf = 0;
    const dt = previous ? Math.min((time - previous) / 1000, .05) : 1 / 60;
    previous = time;
    const alpha = 1 - Math.exp(-response * dt);
    x += (desiredX - x) * alpha;
    y += (desiredY - y) * alpha;
    const moving = Math.abs(desiredX - x) + Math.abs(desiredY - y) > .0001;
    if (!moving) { x = desiredX; y = desiredY; }
    draw();
    if (moving && !disposed) raf = requestAnimationFrame(frame);
    else previous = 0;
  };
  const schedule = () => { if (!raf && !disposed) raf = requestAnimationFrame(frame); };
  const setActive = value => {
    if (active !== value) { active = value; onActiveChange(value); }
  };
  const move = event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    const bounds = hitArea.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    desiredX = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1);
    desiredY = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1);
    setActive(true);
    schedule();
  };
  const reset = () => { desiredX = desiredY = 0; setActive(false); schedule(); };
  const preferenceChanged = () => {
    if (reducedMotion.matches) {
      desiredX = desiredY = x = y = 0;
      setActive(false);
      draw();
    }
  };
  hitArea.addEventListener('pointermove', move, {passive: true});
  hitArea.addEventListener('pointerleave', reset);
  hitArea.addEventListener('pointercancel', reset);
  window.addEventListener('blur', reset);
  reducedMotion.addEventListener('change', preferenceChanged);
  draw();
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    hitArea.removeEventListener('pointermove', move);
    hitArea.removeEventListener('pointerleave', reset);
    hitArea.removeEventListener('pointercancel', reset);
    window.removeEventListener('blur', reset);
    reducedMotion.removeEventListener('change', preferenceChanged);
  };
}
