// Human-Like Oversized Cursor System for HyperFrames compositions.
// Enters from off-screen, walks the eye to interactive elements, clicks to ignite animations.

export function setupCursor(rootEl, tl) {
  const cursor = document.createElement("div");
  cursor.className = "human-cursor";
  cursor.innerHTML = `
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z" 
            fill="#ffffff" stroke="#1c1c1c" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>
  `;
  cursor.style.cssText = `
    position: absolute; left: 50%; top: 115%; width: 68px; height: 68px; z-index: 99;
    filter: drop-shadow(0 6px 12px rgba(0,0,0,0.4)); pointer-events: none;
    transform-origin: 21% 14%; will-change: transform;
  `;
  rootEl.appendChild(cursor);

  return {
    cursor,
    // Glide in to target coordinates and tap
    pointAndClick(x, y, startTime, duration = 0.7) {
      tl.to(cursor, { left: x, top: y, duration: duration, ease: "power3.out" }, startTime);
      // Human-like asymmetric tap
      tl.to(cursor, { scale: 0.82, duration: 0.08, ease: "power2.in" }, startTime + duration);
      tl.to(cursor, { scale: 1.0, duration: 0.18, ease: "power2.out" }, startTime + duration + 0.08);
    },
    // Drift aside so content isn't obscured
    driftAside(x, y, startTime, duration = 0.6) {
      tl.to(cursor, { left: x, top: y, duration: duration, ease: "power2.out" }, startTime);
    },
    // Accelerate off-screen
    exit(startTime) {
      tl.to(cursor, { top: "115%", duration: 0.5, ease: "power2.in" }, startTime);
    }
  };
}
