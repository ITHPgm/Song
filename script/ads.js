// /assets/js/ad-modal.js
(function () {
  'use strict';

  const ADS = [
    'https://omg10.com/4/11382505',
    'https://mistletoeframesethel.com/rs7j3bsy2?key=0e7226fbf9f0ad6766ec55ec89a8d855',
    'https://omg10.com/4/11380515',
    'https://mistletoeframesethel.com/hvtc4usa9i?key=f57c0afa29444d20c9edc489dccfb79e'
  ];

  const STORAGE_KEY_LAST_SHOWN = 'ibk_ads_modal_last_shown';
  const STORAGE_KEY_AD_INDEX = 'ibk_ads_modal_index';

  const SHOW_DELAY_MS = 10 * 1000;
  const REPEAT_INTERVAL_MS = 10 * 60 * 1000;
  const COUNTDOWN_SECONDS = 10;

  const MODAL_ID = 'ibkAdsModalOverlay';
  const STYLE_ID = 'ibk-ads-modal-style';

  let countdownTimer = null;
  let autoShowTimer = null;

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function getViewportMetrics() {
    const vv = window.visualViewport;
    return {
      width: Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || 0),
      height: Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || 0)
    };
  }

  function getNextAdUrl() {
    const currentIndex = Number(safeGet(STORAGE_KEY_AD_INDEX) || '0');
    const nextIndex = currentIndex % ADS.length;
    safeSet(STORAGE_KEY_AD_INDEX, String((nextIndex + 1) % ADS.length));
    return ADS[nextIndex];
  }

  function getLastShownAt() {
    return Number(safeGet(STORAGE_KEY_LAST_SHOWN) || '0');
  }

  function markShown() {
    safeSet(STORAGE_KEY_LAST_SHOWN, String(Date.now()));
  }

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
        box-sizing: border-box;
      }

      #${MODAL_ID} .ibk-ads-container {
        position: relative;
        background: #0b0e14;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
        display: flex;
        flex-direction: column;
        scrollbar-width: none;
        -ms-overflow-style: none;
        width: min(92vw, 680px);
        height: min(92vh, 760px);
        box-sizing: border-box;
      }

      #${MODAL_ID} .ibk-ads-container::-webkit-scrollbar {
        display: none;
      }

      #${MODAL_ID} .ibk-ads-topbar {
        flex: 0 0 auto;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 12px 12px 8px;
        gap: 8px;
        z-index: 5;
      }

      #${MODAL_ID} .ibk-ads-close {
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        border: none;
        border-radius: 30px;
        padding: 8px 16px;
        color: #fff;
        font-size: 15px;
        font-weight: 600;
        cursor: default;
        transition: background 0.15s, transform 0.1s, opacity 0.15s;
        letter-spacing: 0.3px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        user-select: none;
        pointer-events: none;
        flex: 0 0 auto;
        white-space: nowrap;
      }

      #${MODAL_ID} .ibk-ads-close.enabled {
        cursor: pointer;
        pointer-events: auto;
      }

      #${MODAL_ID} .ibk-ads-close.enabled:hover {
        background: rgba(255, 70, 70, 0.85);
        transform: scale(0.96);
      }

      #${MODAL_ID} .ibk-ads-close .ibk-ads-close-icon {
        display: inline;
        font-size: 16px;
        line-height: 1;
      }

      #${MODAL_ID} .ibk-ads-close .ibk-ads-close-label {
        font-size: 14px;
        font-weight: 600;
        min-width: 70px;
        text-align: center;
      }

      #${MODAL_ID} .ibk-ads-content {
        flex: 1 1 auto;
        position: relative;
        background: #0b0e14;
        display: flex;
        align-items: stretch;
        justify-content: stretch;
        overflow: hidden;
        cursor: pointer;
        min-height: 0;
      }

      #${MODAL_ID} .ibk-ads-frame {
        width: 100%;
        height: 100%;
        border: 0;
        background: #0b0e14;
        overflow: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
        pointer-events: none;
      }

      #${MODAL_ID} .ibk-ads-frame::-webkit-scrollbar {
        display: none;
      }

      #${MODAL_ID} .ibk-ads-click-layer {
        position: absolute;
        inset: 0;
        z-index: 2;
        cursor: pointer;
        background: transparent;
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
        z-index: 3;
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

      /* Compact devices */
      #${MODAL_ID}.ibk-ads-compact .ibk-ads-container {
        width: min(100vw - 12px, 680px);
        height: min(100dvh - 12px, 760px);
      }

      #${MODAL_ID}.ibk-ads-compact .ibk-ads-topbar {
        padding: 10px 10px 6px;
      }

      #${MODAL_ID}.ibk-ads-compact .ibk-ads-close {
        padding: 7px 14px;
        font-size: 14px;
      }

      #${MODAL_ID}.ibk-ads-ultra-compact .ibk-ads-overlay {
        padding: 0;
      }

      #${MODAL_ID}.ibk-ads-ultra-compact .ibk-ads-container {
        width: 100vw;
        height: 100dvh;
        border-radius: 0;
      }

      #${MODAL_ID}.ibk-ads-ultra-compact .ibk-ads-topbar {
        padding: calc(10px + env(safe-area-inset-top, 0px)) 10px 6px;
      }

      #${MODAL_ID}.ibk-ads-ultra-compact .ibk-ads-close {
        padding: 6px 12px;
        font-size: 13px;
      }

      #${MODAL_ID}.ibk-ads-ultra-compact .ibk-ads-close .ibk-ads-close-icon {
        font-size: 15px;
      }

      #${MODAL_ID}.ibk-ads-ultra-compact .ibk-ads-close .ibk-ads-close-label {
        min-width: 58px;
      }

      @media (max-width: 520px) {
        #${MODAL_ID}.ibk-ads-overlay {
          padding: 0;
        }

        #${MODAL_ID} .ibk-ads-topbar {
          padding-top: calc(12px + env(safe-area-inset-top, 0px));
          padding-right: calc(12px + env(safe-area-inset-right, 0px));
        }

        #${MODAL_ID} .ibk-ads-container {
          width: 100vw;
          height: 100dvh;
          border-radius: 0;
        }

        #${MODAL_ID} .ibk-ads-close {
          padding: 6px 14px;
          font-size: 14px;
        }

        #${MODAL_ID} .ibk-ads-close .ibk-ads-close-icon {
          font-size: 16px;
        }

        #${MODAL_ID} .ibk-ads-close .ibk-ads-close-label {
          font-size: 13px;
          min-width: 58px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createModal() {
    if (document.getElementById(MODAL_ID)) return;

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className = 'ibk-ads-overlay ibk-ads-hidden';

    overlay.innerHTML = `
      <div class="ibk-ads-container" role="dialog" aria-modal="true" aria-label="Advertisement">
        <div class="ibk-ads-topbar">
          <button type="button" id="ibkAdsCloseBtn" class="ibk-ads-close" aria-label="Close ad">
            <i class="fas fa-times ibk-ads-close-icon"></i>
            <span class="ibk-ads-close-label" id="ibkAdsCountdownLabel">Skip 10s</span>
          </button>
        </div>

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

          <div id="ibkAdsClickLayer" class="ibk-ads-click-layer" aria-hidden="true"></div>

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

  function getClickLayer() {
    return document.getElementById('ibkAdsClickLayer');
  }

  function fitModalToScreen() {
    const modal = getModal();
    const container = modal?.querySelector('.ibk-ads-container');
    if (!modal || !container) return;

    const { width: vw, height: vh } = getViewportMetrics();

    modal.classList.remove('ibk-ads-compact', 'ibk-ads-ultra-compact');

    const ultraSlim = vw <= 360 || vh <= 640;
    const compact = vw <= 520 || vh <= 760;

    if (ultraSlim) {
      modal.classList.add('ibk-ads-ultra-compact');
      container.style.width = `${vw}px`;
      container.style.height = `${vh}px`;
      container.style.borderRadius = '0';
      return;
    }

    if (compact) {
      modal.classList.add('ibk-ads-compact');
      const w = Math.max(320, vw - 12);
      const h = Math.max(480, vh - 12);
      container.style.width = `${Math.min(w, 680)}px`;
      container.style.height = `${Math.min(h, 760)}px`;
      container.style.borderRadius = '18px';
      return;
    }

    const maxWidth = Math.min(vw * 0.85, 680);
    const maxHeight = Math.min(vh * 0.85, 760);

    container.style.width = `${Math.round(Math.max(maxWidth, 320))}px`;
    container.style.height = `${Math.round(Math.max(maxHeight, 480))}px`;
    container.style.borderRadius = '24px';
  }

  function openInSamePage(url) {
    window.location.href = url;
  }

  function setupContentClick(currentUrl) {
    const layer = getClickLayer();
    const content = getContent();
    if (!layer || !content) return;

    layer.onclick = function () {
      openInSamePage(currentUrl);
    };

    content.onclick = function (e) {
      if (e.target.closest('#ibkAdsCloseBtn')) return;
      if (e.target.closest('#ibkAdsClickLayer')) {
        openInSamePage(currentUrl);
      }
    };
  }

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

    const loadTimer = setTimeout(() => {
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
    }

    const label = getCountdownLabel();
    if (label) label.textContent = 'Skip 10s';
  }

  function startCountdown() {
    const closeBtn = getCloseBtn();
    const label = getCountdownLabel();
    if (!closeBtn || !label) return;

    let remaining = COUNTDOWN_SECONDS;

    closeBtn.classList.remove('enabled');
    closeBtn.style.pointerEvents = 'none';
    closeBtn.onclick = null;
    label.textContent = `Skip ${remaining}s`;

    clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
      remaining -= 1;

      if (remaining <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;

        label.textContent = 'Close';
        closeBtn.classList.add('enabled');
        closeBtn.style.pointerEvents = 'auto';
        closeBtn.onclick = hideModal;
        return;
      }

      label.textContent = `Skip ${remaining}s`;
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

    startCountdown();
    scheduleAutoShow();
  }

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

  function init() {
    injectStyles();
    createModal();

    if (isStandalone()) return;

    fitModalToScreen();
    window.addEventListener('resize', fitModalToScreen);
    window.addEventListener('orientationchange', fitModalToScreen);
    window.visualViewport?.addEventListener('resize', fitModalToScreen);

    scheduleAutoShow();

    window.IBKAdsModal = {
      show: showModal,
      hide: hideModal,
      fit: fitModalToScreen
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
