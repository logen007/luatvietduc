  function partnerStrip() {
    // Reuse the original list rather than maintaining a second set of partner data.
    const template = document.createElement('template');
    template.innerHTML = window.LVD_FEATURES?.partnerSlider() || '';
    const logos = [...template.content.querySelectorAll('img')];
    if (!logos.length) return '';
    const group = clone => `<div class="pm-partner-group"${clone ? ' aria-hidden="true"' : ''}>${logos.map(img =>
      `<img src="${esc(img.getAttribute('src'))}" alt="${clone ? '' : esc(img.alt)}" loading="eager" decoding="async" draggable="false" referrerpolicy="no-referrer">`
    ).join('')}</div>`;
    return `<section class="pm-partners" aria-label="${l('Logo đối tác','Partnerlogos')}">
      <div class="container pm-partners-inner"><div class="pm-partner-marquee" tabindex="0" aria-label="${l('Logo đối tác','Partnerlogos')}"><div class="pm-partner-track">${group(false)}${group(true)}</div></div></div>
    </section>`;
  }

