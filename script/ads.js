// /assets/js/ad-modal.js

(function () {

  'use strict';

  const ADS = [
    'https://www.effectivecpmnetwork.com/rs7j3bsy2?key=0e7226fbf9f0ad6766ec55ec89a8d855',
    'https://www.effectivecpmnetwork.com/hvtc4usa9i?key=f57c0afa29444d20c9edc489dccfb79e'
  ];

  const STORAGE_KEY_LAST_SHOWN = 'ibk_ads_modal_last_shown';
  const STORAGE_KEY_AD_INDEX = 'ibk_ads_modal_index';

  const SHOW_DELAY_MS = 10 * 1000;               // show after 10s
  const REPEAT_INTERVAL_MS = 30 * 60 * 1000;     // repeat every 30min
  const COUNTDOWN_SECONDS = 10;

  const MODAL_ID = 'ibkAdsModalOverlay';
  const STYLE_ID = 'ibk-ads-modal-style';

  let countdownTimer = null;
  let autoShowTimer = null;

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function getNextAdUrl() {
    const currentIndex = Number(localStorage.getItem(STORAGE_KEY_AD_INDEX) || '0');
    const nextIndex = currentIndex % ADS.length;
    localStorage.setItem(STORAGE_KEY_AD_INDEX, String((nextIndex + 1) % ADS.length));
    return ADS[nextIndex];
  }

  function getLastShownAt() {
    return Number(localStorage.getItem(STORAGE_KEY_LAST_SHOWN) || '0');
  }

  function markShown() {
    localStorage.setItem(STORAGE_KEY_LAST_SHOWN, String(Date.now()));
  }

  function canShowNow() {
    const lastShown = getLastShownAt();
    if (!lastShown) return true;
    return Date.now() - lastShown >= REPEAT_INTERVAL_MS;
  }

  // ------------------------------------------------------------------
  // Style injection (AdMob‑inspired, scrollbars hidden)
  // ------------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID}.ibk-ads-hidden {
        display: none !important;
      }

      #${MODAL_ID}.ibk-ads-overlay {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.82);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        padding: 16px;
        margin: 0;
      }

      #${MODAL_ID} .ibk-ads-container {
        position: relative;
        background: #0b0e14;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        /* Hide scrollbars on the container itself */
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      #${MODAL_ID} .ibk-ads-container::-webkit-scrollbar {
        display: none;
      }

      /* Close / countdown button – only one, no duplicates */
      #${MODAL_ID} .ibk-ads-close {
        position: absolute;
        top: 14px;
        right: 14px;
        z-index: 10;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        border: none;
        border-radius: 30px;
        padding: 8px 16px;
        color: #fff;
        font-size: 15px;
        font-weight: 600;
        cursor: default;
        transition: background 0.15s, transform 0.1s;
        letter-spacing: 0.3px;
        display: flex;
        align-items: center;
        gap: 6px;
        user-select: none;
        pointer-events: none; /* disabled until countdown ends */
      }

      #${MODAL_ID} .ibk-ads-close.enabled {
        background: rgba(0, 0, 0, 0.65);
        cursor: pointer;
        pointer-events: auto;
      }

      #${MODAL_ID} .ibk-ads-close.enabled:hover {
        background: rgba(255, 70, 70, 0.85);
        transform: scale(0.96);
      }

      /* Hide close icon during countdown, show label only */
      #${MODAL_ID} .ibk-ads-close .ibk-ads-close-icon {
        display: none; /* hidden until countdown ends */
        font-size: 18px;
        line-height: 1;
      }

      #${MODAL_ID} .ibk-ads-close.enabled .ibk-ads-close-icon {
        display: inline; /* show when enabled */
      }

      #${MODAL_ID} .ibk-ads-close .ibk-ads-close-label {
        font-size: 14px;
        font-weight: 500;
        min-width: 60px;
        text-align: center;
        transition: all 0.2s;
      }

      /* Ad content area – clickable */
      #${MODAL_ID} .ibk-ads-content {
        flex: 1;
        position: relative;
        background: #0b0e14;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        cursor: pointer;
      }

      /* Hide iframe scrollbars */
      #${MODAL_ID} .ibk-ads-frame {
        width: 100%;
        height: 100%;
        border: 0;
        background: #0b0e14;
        overflow: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
      }

      #${MODAL_ID} .ibk-ads-frame::-webkit-scrollbar {
        display: none;
      }

      #${MODAL_ID} .ibk-ads-fallback {
        position: absolute;
        inset: 0;
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: #0b0e14;
        color: #cbd5e1;
        text-align: center;
      }

      #${MODAL_ID} .ibk-ads-fallback.show {
        display: flex;
      }

      #${MODAL_ID} .ibk-ads-fallback-media {
        max-width: 90%;
        max-height: 70%;
        border-radius: 12px;
        object-fit: contain;
        background: #0b0e14;
        pointer-events: none;
      }

      #${MODAL_ID} .ibk-ads-fallback-message {
        margin-top: 16px;
        font-size: 14px;
        opacity: 0.7;
      }

      /* ─── Responsive sizing via media queries (fallback) ─── */
      /* The main sizing is now handled by fitModalToScreen() with JS */
      /* We keep these as safety for initial render */
      @media (max-width: 520px) {
        #${MODAL_ID}.ibk-ads-overlay {
          padding: 0;
        }
        #${MODAL_ID} .ibk-ads-container {
          width: 100vw;
          height: 100vh;
          border-radius: 0;
        }
        #${MODAL_ID} .ibk-ads-close {
          top: 12px;
          right: 12px;
          padding: 6px 14px;
          font-size: 14px;
        }
        #${MODAL_ID} .ibk-ads-close .ibk-ads-close-icon {
          font-size: 18px;
        }
        #${MODAL_ID} .ibk-ads-close .ibk-ads-close-label {
          font-size: 13px;
          min-width: 50px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ------------------------------------------------------------------
  // DOM creation
  // ------------------------------------------------------------------
  function createModal() {
    if (document.getElementById(MODAL_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className = 'ibk-ads-overlay ibk-ads-hidden';

    overlay.innerHTML = `
      <div class="ibk-ads-container" role="dialog" aria-modal="true" aria-label="Advertisement">
        <!-- Single close/countdown button -->
        <button type="button" id="ibkAdsCloseBtn" class="ibk-ads-close" aria-label="Close ad">
          <span class="ibk-ads-close-icon">✕</span>
          <span class="ibk-ads-close-label" id="ibkAdsCountdownLabel">skip 10s</span>
        </button>

        <!-- Ad content (clickable) -->
        <div id="ibkAdsContent" class="ibk-ads-content">
          <iframe
            id="ibkAdsFrame"
            class="ibk-ads-frame"
            title="Sponsored content"
            referrerpolicy="no-referrer-when-downgrade"
            loading="eager"
            allow="autoplay; fullscreen; clipboard-read; clipboard-write"
            scrolling="no"
          ></iframe>

          <div id="ibkAdsFallback" class="ibk-ads-fallback">
            <img
              id="ibkAdsFallbackImg"
              class="ibk-ads-fallback-media"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%231e293b'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='16' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3EAd%20unavailable%3C/text%3E%3C/svg%3E"
              alt="Ad preview"
            />
            <p class="ibk-ads-fallback-message">Tap to open advertisement</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  // ------------------------------------------------------------------
  // DOM references
  // ------------------------------------------------------------------
  function getModal() {
    return document.getElementById(MODAL_ID);
  }

  function getCloseBtn() {
    return document.getElementById('ibkAdsCloseBtn');
  }

  function getCountdownLabel() {
    return document.getElementById('ibkAdsCountdownLabel');
  }

  function getContent() {
    return document.getElementById('ibkAdsContent');
  }

  function getFrame() {
    return document.getElementById('ibkAdsFrame');
  }

  function getFallback() {
    return document.getElementById('ibkAdsFallback');
  }

  function getFallbackImg() {
    return document.getElementById('ibkAdsFallbackImg');
  }

  // ------------------------------------------------------------------
  // Core logic
  // ------------------------------------------------------------------
  function fitModalToScreen() {
    const container = document.querySelector(`#${MODAL_ID} .ibk-ads-container`);
    if (!container) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Define max dimensions based on viewport
    let maxWidth, maxHeight;

    if (vw <= 520) {
      // Mobile: full screen
      maxWidth = vw;
      maxHeight = vh;
      container.style.borderRadius = '0';
    } else {
      // Desktop/tablet: use a ratio and limit
      const ratio = 9 / 16; // height/width
      let w = Math.min(vw * 0.85, 680);
      let h = w * ratio;
      if (h > vh * 0.85) {
        h = vh * 0.85;
        w = h / ratio;
      }
      maxWidth = Math.min(w, vw * 0.85);
      maxHeight = Math.min(h, vh * 0.85);

      // Ensure minimum sizes
      maxWidth = Math.max(maxWidth, 320);
      maxHeight = Math.max(maxHeight, 480);

      // Round to avoid subpixel issues
      maxWidth = Math.round(maxWidth);
      maxHeight = Math.round(maxHeight);

      container.style.borderRadius = '24px';
    }

    container.style.width = maxWidth + 'px';
    container.style.height = maxHeight + 'px';
    container.style.maxWidth = 'none';
    container.style.maxHeight = 'none';
  }

  function openInSamePage(url) {
    location.href = url;
  }

  // Make the ad content clickable (includes fallback area)
  function setupContentClick(currentUrl) {
    const content = getContent();
    if (!content) return;
    // Remove any previous listener to avoid duplication
    content.onclick = null;
    content.addEventListener('click', function (e) {
      if (e.target.closest('#ibkAdsCloseBtn')) return;
      openInSamePage(currentUrl);
    });
  }

  // Show fallback if iframe fails
  function showFallback() {
    const fallback = getFallback();
    if (fallback) fallback.classList.add('show');
  }

  function loadAdInFrame(url) {
    const frame = getFrame();
    const fallback = getFallback();
    if (!frame) return false;

    if (fallback) fallback.classList.remove('show');

    frame.src = url;

    let loadTimer = setTimeout(() => {
      if (fallback && !fallback.classList.contains('show')) {
        showFallback();
      }
    }, 6000);

    frame.onload = function () {
      clearTimeout(loadTimer);
      if (fallback) fallback.classList.remove('show');
    };

    frame.onerror = function () {
      clearTimeout(loadTimer);
      showFallback();
    };

    return true;
  }

  // Countdown and close logic – shows "skip Xs", hides close icon until end
  function startCountdown(currentUrl) {
    const closeBtn = getCloseBtn();
    const label = getCountdownLabel();
    if (!closeBtn || !label) return;

    let remaining = COUNTDOWN_SECONDS;

    // Disable close button
    closeBtn.classList.remove('enabled');
    closeBtn.style.pointerEvents = 'none';

    // Show "skip Xs" text, hide close icon
    const icon = closeBtn.querySelector('.ibk-ads-close-icon');
    if (icon) icon.style.display = 'none';

    label.textContent = 'skip ' + remaining + 's';

    clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        // Countdown ended: show close icon and enable button
        label.textContent = '✕';
        if (icon) icon.style.display = 'inline';
        closeBtn.classList.add('enabled');
        closeBtn.style.pointerEvents = 'auto';
        closeBtn.onclick = function () {
          hideModal();
        };
        return;
      }
      label.textContent = 'skip ' + remaining + 's';
    }, 1000);
  }

  function showModal() {
    const modal = getModal();
    if (!modal) return;

    const url = getNextAdUrl();

    loadAdInFrame(url);
    setupContentClick(url);

    modal.classList.remove('ibk-ads-hidden');
    fitModalToScreen();
    markShown();

    startCountdown(url);

    scheduleAutoShow();
  }

  function hideModal() {
    const modal = getModal();
    if (!modal) return;

    modal.classList.add('ibk-ads-hidden');

    const frame = getFrame();
    const fallback = getFallback();
    if (frame) frame.src = 'about:blank';
    if (fallback) fallback.classList.remove('show');

    clearInterval(countdownTimer);
    countdownTimer = null;

    const closeBtn = getCloseBtn();
    if (closeBtn) {
      closeBtn.classList.remove('enabled');
      closeBtn.style.pointerEvents = 'none';
      closeBtn.onclick = null;
      // Reset icon visibility
      const icon = closeBtn.querySelector('.ibk-ads-close-icon');
      if (icon) icon.style.display = 'none';
      const label = getCountdownLabel();
      if (label) label.textContent = 'skip 10s';
    }
  }

  // ------------------------------------------------------------------
  // Scheduling
  // ------------------------------------------------------------------
  function scheduleAutoShow() {
    if (autoShowTimer) clearTimeout(autoShowTimer);

    const lastShown = getLastShownAt();
    const elapsed = Date.now() - lastShown;

    const delay = (!lastShown || elapsed >= REPEAT_INTERVAL_MS)
      ? SHOW_DELAY_MS
      : (REPEAT_INTERVAL_MS - elapsed);

    autoShowTimer = setTimeout(() => {
      if (!isStandalone()) {
        showModal();
      }
    }, delay);
  }

  // ------------------------------------------------------------------
  // Initialisation
  // ------------------------------------------------------------------
  function init() {
    injectStyles();
    createModal();

    if (isStandalone()) return;

    const closeBtn = getCloseBtn();
    if (closeBtn) {
      closeBtn.classList.remove('enabled');
      closeBtn.style.pointerEvents = 'none';
      const icon = closeBtn.querySelector('.ibk-ads-close-icon');
      if (icon) icon.style.display = 'none';
    }

    window.addEventListener('resize', fitModalToScreen);

    scheduleAutoShow();

    window.IBKAdsModal = {
      show: showModal,
      hide: hideModal,
      next: getNextAdUrl,
      schedule: scheduleAutoShow,
      fit: fitModalToScreen
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
