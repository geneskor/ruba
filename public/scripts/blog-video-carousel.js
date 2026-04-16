(() => {
  if (window.__blogVideoCarouselInit) {
    return;
  }
  window.__blogVideoCarouselInit = true;

  const videoStrip = document.querySelector("[data-video-strip]");
  const videoPrev = document.querySelector("[data-video-prev]");
  const videoNext = document.querySelector("[data-video-next]");
  const videoSlides = Array.from(document.querySelectorAll(".video-slide"));
  const blogVideos = Array.from(document.querySelectorAll(".blog-video"));
  const grid = document.querySelector(".article-grid");

  const setupArticleGridHeights = () => {
    if (!grid) {
      return;
    }

    let resizeTimer = 0;

    const updateHeights = () => {
      grid.style.removeProperty("--article-title-height");
      grid.style.removeProperty("--article-excerpt-height");

      const titles = grid.querySelectorAll(".article-card__title");
      const excerpts = grid.querySelectorAll(".article-card__excerpt");
      let maxTitle = 0;
      let maxExcerpt = 0;

      titles.forEach((title) => {
        maxTitle = Math.max(maxTitle, title.offsetHeight);
      });

      excerpts.forEach((excerpt) => {
        maxExcerpt = Math.max(maxExcerpt, excerpt.offsetHeight);
      });

      if (maxTitle) {
        grid.style.setProperty("--article-title-height", `${maxTitle}px`);
      }
      if (maxExcerpt) {
        grid.style.setProperty("--article-excerpt-height", `${maxExcerpt}px`);
      }
    };

    const scheduleUpdate = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        requestAnimationFrame(updateHeights);
      }, 120);
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(scheduleUpdate);
    }

    window.addEventListener("load", scheduleUpdate);
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();
  };

  setupArticleGridHeights();

  if (!videoStrip || !blogVideos.length) {
    return;
  }

  const connection =
    navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection;
  const carouselQuery = window.matchMedia("(max-width: 639px)");

  const shouldPreferSd = () => {
    const saveData = Boolean(connection?.saveData);
    const effectiveType = connection?.effectiveType ?? "";
    const slowConnection = /(^|-)2g|3g/.test(effectiveType);
    return saveData || slowConnection;
  };

  const getPreferredVideoSrc = (video) => {
    const hdSrc = video.dataset.srcHd ?? "";
    const sdSrc = video.dataset.srcSd ?? hdSrc;

    if (!hdSrc && !sdSrc) {
      return "";
    }

    return shouldPreferSd() ? sdSrc : hdSrc;
  };

  const ensureVideoSource = (video) => {
    const preferredSrc = getPreferredVideoSrc(video);
    if (!preferredSrc || video.getAttribute("src") === preferredSrc) {
      return;
    }

    if (!video.paused && video.getAttribute("src")) {
      return;
    }

    video.setAttribute("src", preferredSrc);
    video.load();
  };

  const clearVideoSource = (video) => {
    if (!video.paused || video.dataset.hasPlayed === "true") {
      return;
    }
    if (!video.getAttribute("src")) {
      return;
    }

    video.removeAttribute("src");
    video.load();
  };

  const syncIdleVideoQuality = () => {
    blogVideos.forEach((video) => {
      if (!video.paused || video.dataset.hasPlayed === "true") {
        return;
      }
      ensureVideoSource(video);
    });
  };

  const setupVideoLazyLoading = () => {
    if (!("IntersectionObserver" in window)) {
      blogVideos.forEach(ensureVideoSource);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (!(video instanceof HTMLVideoElement)) {
            return;
          }

          if (entry.isIntersecting) {
            ensureVideoSource(video);
            return;
          }

          clearVideoSource(video);
        });
      },
      {
        root: null,
        rootMargin: "220px 0px",
        threshold: 0.15
      }
    );

    blogVideos.forEach((video) => {
      observer.observe(video);
      video.addEventListener("pointerdown", () => ensureVideoSource(video));
      video.addEventListener("pointerenter", () => ensureVideoSource(video));
      video.addEventListener("focus", () => ensureVideoSource(video));
      video.addEventListener("play", () => ensureVideoSource(video));
      video.addEventListener("playing", () => {
        video.dataset.hasPlayed = "true";
      });
    });
  };

  const pauseOtherVideos = (activeVideo) => {
    blogVideos.forEach((otherVideo) => {
      if (otherVideo !== activeVideo) {
        otherVideo.pause();
      }
    });
  };

  const syncActiveVideo = (event) => {
    const target = event.target;

    if (!(target instanceof HTMLVideoElement) || !target.classList.contains("blog-video")) {
      return;
    }

    pauseOtherVideos(target);
    window.setTimeout(() => {
      pauseOtherVideos(target);
    }, 0);
  };

  videoStrip.addEventListener("play", syncActiveVideo, true);
  videoStrip.addEventListener("playing", syncActiveVideo, true);

  if (videoPrev && videoNext && videoSlides.length > 1) {
    const getMaxIndex = () => Math.max(0, videoSlides.length - 1);
    const isMobileVideoCarousel = () => carouselQuery.matches;
    let activeVideoIndex = 0;

    const pauseAllVideos = () => {
      blogVideos.forEach((video) => video.pause());
    };

    const syncVideoNav = () => {
      videoPrev.disabled = activeVideoIndex <= 0;
      videoNext.disabled = activeVideoIndex >= getMaxIndex();
    };

    const applyMobileVideoIndex = () => {
      videoStrip.style.transform = `translate3d(-${activeVideoIndex * 100}%, 0, 0)`;
      syncVideoNav();
    };

    const syncVideoMode = () => {
      if (isMobileVideoCarousel()) {
        applyMobileVideoIndex();
        return;
      }

      videoStrip.style.removeProperty("transform");
    };

    const setActiveVideo = (index) => {
      const safeIndex = Math.min(getMaxIndex(), Math.max(0, index));

      if (safeIndex === activeVideoIndex) {
        syncVideoNav();
        return;
      }

      activeVideoIndex = safeIndex;
      pauseAllVideos();
      applyMobileVideoIndex();
    };

    videoPrev.addEventListener("click", () => {
      if (!isMobileVideoCarousel()) {
        return;
      }

      setActiveVideo(activeVideoIndex - 1);
    });

    videoNext.addEventListener("click", () => {
      if (!isMobileVideoCarousel()) {
        return;
      }

      setActiveVideo(activeVideoIndex + 1);
    });

    window.addEventListener("resize", syncVideoMode);
    syncVideoMode();
  }

  window.addEventListener("resize", syncIdleVideoQuality, { passive: true });
  if (connection?.addEventListener) {
    connection.addEventListener("change", syncIdleVideoQuality);
  }

  setupVideoLazyLoading();
})();
