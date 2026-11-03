  const country = (code, path, title, titleDe, note, noteDe) => `<a href="#/phap-luat/${path}" class="pm-country">
    <img class="pm-country-flag" src="/assets/flags/${code}.svg" alt="" width="30" height="20">
    <div class="pm-country-copy"><h2>${l(title, titleDe)}</h2><p>${l(note, noteDe)}</p></div>${arrow}
  </a>`;

  const story = id => {
    const s = E.find(id);
    return s ? `<article class="press-card pm-story"><a class="press-image-link" href="#/tin/${s.id}" aria-label="${esc(s.title)}">${E.image(s.photo)}</a><div class="press-copy">${E.tag(s)}<h3><a href="#/tin/${s.id}">${esc(s.title)}</a></h3><a class="lvd-link pm-story-read" href="#/tin/${s.id}">${l('Đọc bài viết','Beitrag lesen')} ${arrow}</a></div></article>` : '';
  };

