  let videoChoice = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function syncVideo() {
    const video = document.querySelector('.pm-hero-video');
    if (!video) return;
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
    }
    const paused = videoChoice === 'pause' || ((reducedMotion.matches || navigator.connection?.saveData) && videoChoice !== 'play') || document.hidden;
    video.autoplay = !paused;
    if (paused) video.pause();
    else video.play().catch(update);
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

