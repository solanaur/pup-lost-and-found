/** Lucide icon helper — call hydrateIcons() after DOM updates */
function icon(name, size) {
  size = size || 18;
  return `<i data-lucide="${name}" class="ico" style="width:${size}px;height:${size}px"></i>`;
}

function hydrateIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
  }
}

window.icon = icon;
window.hydrateIcons = hydrateIcons;
