(() => {
  if (window.__leadFormInit) {
    return;
  }
  window.__leadFormInit = true;

  const phoneInputs = document.querySelectorAll('.lead-form input[name="phone"]');
  const leadForms = document.querySelectorAll(".lead-form form");

  leadForms.forEach((form) => {
    const nextInput = form.querySelector('input[name="_next"]');
    if (nextInput && window.location && window.location.origin) {
      nextInput.value = new URL(nextInput.value, window.location.origin).toString();
    }

    form.addEventListener('submit', () => {
      if (typeof ym === 'function') {
        ym(108985083, 'reachGoal', 'lead');
      }
    });
  });

  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, "");
    if (!digits) {
      return "";
    }

    if (digits.startsWith("8")) {
      digits = `7${digits.slice(1)}`;
    } else if (!digits.startsWith("7")) {
      digits = `7${digits}`;
    }

    digits = digits.slice(0, 11);
    const rest = digits.slice(1);
    let result = "+7";

    if (rest.length > 0) {
      result += ` (${rest.slice(0, 3)}`;
    }
    if (rest.length >= 3) {
      result += ")";
    }
    if (rest.length > 3) {
      result += ` ${rest.slice(3, 6)}`;
    }
    if (rest.length > 6) {
      result += ` ${rest.slice(6, 8)}`;
    }
    if (rest.length > 8) {
      result += `-${rest.slice(8, 10)}`;
    }

    return result;
  };

  const caretFromDigits = (value, digitsCount) => {
    if (digitsCount <= 0) {
      return 0;
    }

    let count = 0;
    for (let i = 0; i < value.length; i += 1) {
      if (/\d/.test(value[i])) {
        count += 1;
      }
      if (count >= digitsCount) {
        return i + 1;
      }
    }

    return value.length;
  };

  phoneInputs.forEach((phoneInput) => {
    if (phoneInput.dataset.maskBound === "true") {
      return;
    }

    const onInput = (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      const prevValue = target.value;
      const caret = target.selectionStart ?? prevValue.length;
      const digitsBefore = prevValue.slice(0, caret).replace(/\D/g, "").length;
      const formatted = formatPhone(prevValue);

      target.value = formatted;
      const nextCaret = caretFromDigits(formatted, digitsBefore);
      target.setSelectionRange(nextCaret, nextCaret);
    };

    phoneInput.addEventListener("input", onInput);
    phoneInput.dataset.maskBound = "true";
  });
})();
