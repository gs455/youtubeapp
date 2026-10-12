// ---- Header layout ---------------------------------------------------------
// The folder tabs sit on the top row when they
// fit. If they don't, they move to their own line below the header row.
// The decision is based on the tabs' natural width, so it doesn't depend on
// where they currently are.

const TAB_GAP_PX = 4;

// Total width the tab strip needs on one line.
function tabStripNaturalWidth() {
  const items = [...byId('tabs').children];
  const widths = items.map((el) => el.getBoundingClientRect().width);
  return widths.reduce((sum, width) => sum + width, 0) + TAB_GAP_PX * Math.max(widths.length - 1, 0);
}

// Width left for the tabs in the header's left column after the toggles.
function tabStripAvailableWidth() {
  const leftColumn = byId('header-left');
  const toggleWidth = byId('theme').offsetWidth + byId('narrow').offsetWidth;
  const visibleToggles = [byId('theme'), byId('narrow')].filter((el) => el.offsetWidth > 0).length;
  return leftColumn.clientWidth - toggleWidth - TAB_GAP_PX * visibleToggles;
}

function updateTabPlacement() {
  const tabStrip = byId('tab-strip');
  const fits = tabStripNaturalWidth() <= tabStripAvailableWidth();
  const target = fits ? byId('header-left') : byId('tabs-line');
  if (tabStrip.parentElement !== target) {
    target.appendChild(tabStrip);
  }
}

window.addEventListener('resize', updateTabPlacement);
