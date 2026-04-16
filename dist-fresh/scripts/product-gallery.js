(() => {
  if (window.__productGalleryInit) {
    return;
  }
  window.__productGalleryInit = true;

  const galleryRoots = document.querySelectorAll("[data-gallery-root]");

  galleryRoots.forEach((root) => {
    const track = root.querySelector("[data-gallery-track]");
    const prev = root.querySelector("[data-gallery-prev]");
    const next = root.querySelector("[data-gallery-next]");

    if (!track || !prev || !next) {
      return;
    }

    const slides = Array.from(track.querySelectorAll(".gallery-slide"));
    if (!slides.length) {
      return;
    }

    const getSlideWidth = () => slides[0].clientWidth || track.clientWidth;
    const getIndex = () => {
      const width = getSlideWidth();
      if (!width) {
        return 0;
      }
      return Math.round(track.scrollLeft / width);
    };

    prev.addEventListener("click", () => {
      const width = getSlideWidth();
      if (!width) {
        return;
      }

      const nextIndex = (getIndex() - 1 + slides.length) % slides.length;
      track.scrollTo({ left: nextIndex * width, behavior: "smooth" });
    });

    next.addEventListener("click", () => {
      const width = getSlideWidth();
      if (!width) {
        return;
      }

      const nextIndex = (getIndex() + 1) % slides.length;
      track.scrollTo({ left: nextIndex * width, behavior: "smooth" });
    });
  });
})();
