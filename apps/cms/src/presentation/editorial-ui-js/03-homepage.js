  E.home = () => `<section class="pm-hero" aria-labelledby="pm-title">
    <video class="pm-hero-video" muted loop playsinline preload="none" poster="/media/legal-hero-stock-poster-v4.webp" aria-hidden="true" tabindex="-1"><source data-src="/media/legal-hero-stock-v4.mp4" type="video/mp4"></video>
    <button class="pm-video-toggle" type="button" aria-label="${l('Tạm dừng video','Video anhalten')}" aria-pressed="false"><svg class="pm-video-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><svg class="pm-video-play" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg></button>
    <div class="container pm-hero-inner"><div class="pm-hero-copy">
      <h1 id="pm-title">${l('Giải đáp pháp luật <br>Việt Nam và Đức.','Recht in Vietnam <br>und Deutschland.')}</h1>
      <p class="pm-hero-description">${l('Từ cư trú, quốc tịch đến các vấn đề về gia đình, tài&nbsp;sản và công việc.','Von Aufenthalt und Staatsangehörigkeit bis zu Familie, Eigentum und Arbeit.')}</p>
      <form id="home-ask" class="pm-ask ask-box"><label class="sr-only" for="home-question">${l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')}</label><div class="pm-ask-row"><textarea id="home-question" name="question" maxlength="2000" required placeholder="${l('Bạn cần làm rõ vấn đề gì?','Was möchten Sie klären?')}" rows="1"></textarea><button class="button" type="submit" aria-label="${l('Gửi câu hỏi','Frage senden')}">${l('Gửi câu hỏi','Frage senden')} ${arrow}</button></div></form>
      <div class="pm-hero-links"><a href="#/tra-cuu">${l('Thư viện','Rechtsbibliothek')} ${arrow}</a></div>
    </div></div>${partnerStrip()}
  </section>
  <section class="pm-countries container" aria-label="${l('Thư viện','Rechtsbibliotheken')}">
    ${country('vn','viet-nam','Pháp luật Việt Nam','Vietnamesisches Recht','16 lĩnh vực · 303 chủ đề','16 Rechtsgebiete · 303 Themen')}
    ${country('de','duc','Pháp luật Đức','Deutsches Recht','16 lĩnh vực','16 Rechtsgebiete')}
  </section>
  <section class="pm-news chat-news"><div class="container">
    <div class="pm-section-head"><h2>${l('Tin tức & đời sống','Nachrichten & Alltag')}</h2><a href="#/tin-tuc" class="lvd-link">${l('Xem tất cả tin tức','Alle Nachrichten')} ${arrow}</a></div>
    <div class="pm-news-grid press-grid">${['mindestlohn-2026','kindergeld-2026','deutschlandticket-2027'].map(story).join('')}</div>
  </div></section>
  <section class="pm-fields"><div class="container">
    <div class="pm-section-head"><h2>${l('Chủ đề đang được quan tâm','Themen im Fokus')}</h2><a class="lvd-link" href="#/tra-cuu">${l('Xem tất cả lĩnh vực','Alle Rechtsgebiete')} ${arrow}</a></div>
    <div class="pm-fields-grid">${C.featuredGroups.map(g => `<a href="#/chu-de/${g.id}"><span class="pm-field-icon">${icon(g.icon || 'book')}</span><h3>${esc(window.LVD_I18N.groupTitle(g.title))}</h3><span class="pm-field-bottom"><span class="pm-topic-stat"><b class="pm-topic-number">${g.count}</b><span class="pm-topic-unit">${l('chủ đề','Themen')}</span></span>${arrow}</span></a>`).join('')}</div>
  </div></section>`;

