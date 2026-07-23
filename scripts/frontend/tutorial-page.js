document.addEventListener("DOMContentLoaded", async () => {
  const localStorageKey = "fd_tutorial_progress_v2";
  const progressEndpoint = "/api/tutorial/progress";
  const allowedSteps = new Set([
    "cuenta",
    "llave",
    "firma",
    "verificacion",
    "resultado",
  ]);
  const stepInputs = Array.from(
    document.querySelectorAll("[data-tutorial-step]"),
  );
  const progressText = document.getElementById("progressText");
  const progressPercent = document.getElementById("progressPercent");
  const progressDial = document.getElementById("progressDial");
  const progressStorageStatus = document.getElementById(
    "progressStorageStatus",
  );
  const resetButton = document.getElementById("resetTutorialProgress");
  const passwordChangePending =
    localStorage.getItem("forcePasswordChange") === "true";
  const authToken = passwordChangePending
    ? null
    : localStorage.getItem("token")?.trim() || null;

  let storageMode = "local";
  let pendingSave = null;
  let saveInProgress = false;

  function normalizeSteps(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value)].filter(
      (step) => typeof step === "string" && allowedSteps.has(step),
    );
  }

  function readLocalProgress() {
    try {
      return normalizeSteps(
        JSON.parse(localStorage.getItem(localStorageKey) || "[]"),
      );
    } catch (_error) {
      return [];
    }
  }

  function writeLocalProgress(completedSteps) {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(completedSteps));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function setStorageStatus(message, state = "") {
    if (!progressStorageStatus) return;
    progressStorageStatus.textContent = message;
    if (state) {
      progressStorageStatus.dataset.state = state;
    } else {
      delete progressStorageStatus.dataset.state;
    }
  }

  function getCompletedSteps() {
    return stepInputs
      .filter((input) => input.checked)
      .map((input) => input.dataset.tutorialStep);
  }

  function applyCompletedSteps(completedSteps) {
    const normalized = normalizeSteps(completedSteps);
    stepInputs.forEach((input) => {
      input.checked = normalized.includes(input.dataset.tutorialStep);
    });
  }

  function renderProgress() {
    const completedSteps = getCompletedSteps();
    const total = stepInputs.length;
    const completed = completedSteps.length;
    const percentage = total ? Math.round((completed / total) * 100) : 0;

    if (progressText) {
      progressText.textContent = `${completed} de ${total} etapas`;
    }

    if (progressPercent) {
      progressPercent.textContent = `${percentage}%`;
    }

    if (progressDial) {
      progressDial.style.setProperty("--progress", `${percentage * 3.6}deg`);
      progressDial.setAttribute("aria-valuemax", String(total));
      progressDial.setAttribute("aria-valuenow", String(completed));
    }

    document.querySelectorAll("[data-step-status]").forEach((status) => {
      status.classList.toggle(
        "complete",
        completedSteps.includes(status.dataset.stepStatus),
      );
    });

    if (resetButton) {
      resetButton.hidden = completed === 0;
    }
  }

  async function saveProgressToAccount(completedSteps) {
    const response = await fetch(progressEndpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ completedSteps }),
    });

    if (!response.ok) {
      throw new Error("No se pudo sincronizar el progreso");
    }
  }

  async function flushPendingSaves() {
    if (saveInProgress) return;
    saveInProgress = true;

    while (pendingSave) {
      const completedSteps = pendingSave;
      pendingSave = null;

      if (storageMode === "account" && authToken) {
        setStorageStatus("Guardando en tu cuenta…");
        try {
          await saveProgressToAccount(completedSteps);
          setStorageStatus("Guardado en tu cuenta", "saved");
        } catch (_error) {
          writeLocalProgress(completedSteps);
          setStorageStatus("Sin conexión · respaldo local", "error");
        }
      } else if (writeLocalProgress(completedSteps)) {
        setStorageStatus("Guardado en este navegador", "saved");
      } else {
        setStorageStatus("El navegador bloqueó el guardado", "error");
      }
    }

    saveInProgress = false;
  }

  function queueProgressSave() {
    pendingSave = getCompletedSteps();
    flushPendingSaves();
  }

  async function initializeProgress() {
    stepInputs.forEach((input) => {
      input.disabled = true;
    });

    if (authToken) {
      try {
        const response = await fetch(progressEndpoint, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          storageMode = "account";
          applyCompletedSteps(data.completedSteps);
          setStorageStatus("Guardado en tu cuenta", "saved");
        } else {
          applyCompletedSteps(readLocalProgress());
          setStorageStatus("Guardado en este navegador", "saved");
        }
      } catch (_error) {
        applyCompletedSteps(readLocalProgress());
        setStorageStatus("Sin conexión · progreso local", "error");
      }
    } else {
      applyCompletedSteps(readLocalProgress());
      setStorageStatus("Guardado en este navegador", "saved");
    }

    stepInputs.forEach((input) => {
      input.disabled = false;
    });
    renderProgress();
  }

  stepInputs.forEach((input) => {
    input.addEventListener("change", () => {
      renderProgress();
      queueProgressSave();
    });
  });

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      stepInputs.forEach((input) => {
        input.checked = false;
      });
      renderProgress();
      queueProgressSave();
      document.getElementById("preparacion")?.scrollIntoView();
    });
  }

  const navigationLinks = Array.from(
    document.querySelectorAll("[data-nav-section]"),
  );
  const trackedSections = Array.from(
    document.querySelectorAll("[data-track-section]"),
  );

  function setActiveSection(sectionId) {
    navigationLinks.forEach((link) => {
      const isActive = link.dataset.navSection === sectionId;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry) {
          setActiveSection(visibleEntry.target.dataset.trackSection);
        }
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0, 0.1, 0.3],
      },
    );

    trackedSections.forEach((section) => observer.observe(section));
  }

  function normalizeAssetUrl(value, fallback) {
    if (typeof value !== "string" || !value.trim()) return fallback;
    const source = value.trim();
    if (/^(data:|blob:|https?:\/\/|\/)/i.test(source)) return source;
    if (source.toLowerCase().includes("favicon.ico")) return "/favicon.ico";
    return `/${source.replace(/^(\.\.\/)+/, "")}`;
  }

  function applyFavicon(faviconSource) {
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.href = normalizeAssetUrl(faviconSource, "/favicon.ico");
    }
  }

  function applyBrandLogo(logoUrl) {
    document.querySelectorAll("[data-brand-logo]").forEach((logo) => {
      if (logoUrl) {
        logo.src = logoUrl;
        logo.removeAttribute("data-default-logo");
      } else {
        logo.src = "/recursos/logotipo-de-github.png";
        logo.dataset.defaultLogo = "true";
      }

      logo.addEventListener(
        "error",
        () => {
          logo.src = "/recursos/logotipo-de-github.png";
          logo.dataset.defaultLogo = "true";
        },
        { once: true },
      );
    });
  }

  async function loadPublicVisualConfig() {
    try {
      const response = await fetch("/api/visual-config/public", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;

      const data = await response.json();
      const config = data?.config || data;
      const institutionName = config?.institution_name;

      if (institutionName) {
        document.querySelectorAll("[data-institution-name]").forEach((element) => {
          element.textContent = institutionName;
        });
        document.title = `Guía de uso | ${institutionName}`;
        const description = document.querySelector('meta[name="description"]');
        if (description) {
          description.content = `Guía paso a paso para crear una llave, firmar y verificar documentos en ${institutionName}.`;
        }
      }

      if (["fondo1", "fondo2", "fondoOscuro"].includes(config?.background)) {
        document.body.dataset.bg = config.background;
      }

      applyFavicon(config?.favicon);
      applyBrandLogo(config?.logo_url || null);
    } catch (_error) {
      applyBrandLogo(null);
    }
  }

  const year = document.getElementById("tutorialYear");
  if (year) year.textContent = String(new Date().getFullYear());

  await Promise.all([initializeProgress(), loadPublicVisualConfig()]);
  document.documentElement.classList.remove("visual-pending");
  document.documentElement.classList.add("visual-ready");
});
