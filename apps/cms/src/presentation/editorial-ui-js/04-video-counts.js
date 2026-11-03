  let videoChoice = null;
  let heroObserver = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function syncVideo() {
    const video = document.querySelector('.pm-hero-video');
    if (!video) { heroObserver?.disconnect(); heroObserver=null; return; }
    const button = document.querySelector('.pm-video-toggle');
    const update = () => {
      button?.setAttribute('aria-pressed', String(video.paused));
      button?.setAttribute('aria-label', video.paused ? l('Phát video','Video abspielen') : l('Tạm dừng video','Video anhalten'));
    };
    if (!video.dataset.heroReady) {
      video.dataset.heroReady = 'true';
      video.muted = true;
      video.addEventListener('play', update);
      video.addEventListener('pause', update);
      button?.addEventListener('click', () => { videoChoice = video.paused ? 'play' : 'pause'; syncVideo(); });
      heroObserver?.disconnect();
      if('IntersectionObserver' in window){
        heroObserver=new IntersectionObserver(([entry])=>{video.dataset.heroVisible=String(entry.isIntersecting);syncVideo();},{threshold:0});
        heroObserver.observe(video);
      }
    }
    const paused = videoChoice === 'pause' || video.dataset.heroVisible==='false' || ((reducedMotion.matches || navigator.connection?.saveData) && videoChoice !== 'play') || document.hidden;
    video.autoplay = !paused;
    if (paused) video.pause();
    else {
      const source=video.querySelector('source[data-src]');
      if(source){source.src=source.dataset.src;source.removeAttribute('data-src');video.load();}
      video.play().catch(update);
    }
    update();
  }

  function topicCounts() {
    document.querySelectorAll('.catalog-group-body>small').forEach(el => {
      if (el.querySelector('.pm-topic-number')) return;
      const match = el.textContent.trim().match(/^(\d+)\s+(.+)$/);
      if (!match) return;
      el.dataset.noTranslation = '';
      el.innerHTML = `<b class="pm-topic-number">${match[1]}</b><span class="pm-topic-unit">${esc(match[2])}</span>`;
    });
  }

