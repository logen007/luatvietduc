  function partnerStrip() {
    // Reuse the original list rather than maintaining a second set of partner data.
    const template = document.createElement('template');
    template.innerHTML = window.LVD_FEATURES?.partnerSlider() || '';
    const logos = [...template.content.querySelectorAll('img')];
    if (!logos.length) return '';
    // Keep the white knockout inside each SVG, avoiding external CSS filter references on mobile.
    const group = clone => `<div class="pm-partner-group"${clone ? ' aria-hidden="true"' : ''}>${logos.map((img,index) => {
      const filterId=`lvd-logo-${clone?'copy':'original'}-${index}`;
      return `<svg class="pm-partner-logo" viewBox="0 0 220 60" width="140" height="38" role="img" aria-label="${clone?'':esc(img.alt)}" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs><filter id="${filterId}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -.2126 -.7152 -.0722 0 1"/><feComponentTransfer><feFuncA type="linear" slope="1.1" intercept="-.05"/></feComponentTransfer><feComposite operator="in" in2="SourceGraphic"/></filter></defs><image href="${esc(img.getAttribute('src'))}" width="220" height="60" preserveAspectRatio="xMidYMid meet" filter="url(#${filterId})"/></svg>`;
    }).join('')}</div>`;
    return `<section class="pm-partners" aria-label="${l('Logo đối tác','Partnerlogos')}">
      <div class="container pm-partners-inner"><div class="pm-partner-marquee" tabindex="0" aria-label="${l('Logo đối tác','Partnerlogos')}"><div class="pm-partner-track">${group(false)}${group(true)}</div></div></div>
    </section>`;
  }

