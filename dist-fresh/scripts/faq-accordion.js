(() => {
  if (window.__faqAccordionInit) {
    return;
  }
  window.__faqAccordionInit = true;

  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const summary = item.querySelector("summary");
    if (!summary) {
      return;
    }

    const getClosedHeight = () => {
      const style = getComputedStyle(item);
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      return summary.offsetHeight + paddingTop + paddingBottom;
    };

    summary.addEventListener("click", (event) => {
      event.preventDefault();

      const isOpen = item.hasAttribute("open");
      const startHeight = item.offsetHeight;

      if (isOpen) {
        item.classList.add("is-animating");
        item.style.height = `${startHeight}px`;
        requestAnimationFrame(() => {
          item.style.height = `${getClosedHeight()}px`;
        });

        const onCloseEnd = (e) => {
          if (e.propertyName !== "height") {
            return;
          }
          item.removeAttribute("open");
          item.classList.remove("is-animating");
          item.style.height = "";
          item.removeEventListener("transitionend", onCloseEnd);
        };
        item.addEventListener("transitionend", onCloseEnd);
      } else {
        item.setAttribute("open", "");
        item.classList.add("is-animating");
        item.style.height = `${startHeight}px`;

        requestAnimationFrame(() => {
          item.style.height = `${item.scrollHeight}px`;
        });

        const onOpenEnd = (e) => {
          if (e.propertyName !== "height") {
            return;
          }
          item.classList.remove("is-animating");
          item.style.height = "";
          item.removeEventListener("transitionend", onOpenEnd);
        };
        item.addEventListener("transitionend", onOpenEnd);
      }
    });
  });
})();
