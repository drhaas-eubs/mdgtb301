/* ============================================================================
 * MDGTB301 · Framework Sheet Viewer
 * v1.0 · Drop-in protected PDF viewer
 * © 2026 Dr. Hildegard Haas · EU Business School
 *
 * ------------------------------------------------------------------------
 * USAGE
 * ------------------------------------------------------------------------
 *   1. Include this script and framework-viewer.css on each unit page.
 *   2. Place framework-library.pdf next to the script (or set
 *      window.FW_PDF_URL = '/path/to/file.pdf' before loading this file).
 *   3. Either:
 *      A) Add a button anywhere on the page with these data attributes:
 *           <button class="fw-view-sheet-btn"
 *                   data-fw-slibrary="1"
 *                   data-fw-sheet="1">
 *             <span class="fw-icon">📄</span>
 *             <span class="fw-btn-label">View Framework Sheet</span>
 *           </button>
 *         The viewer auto-wires every such button on page load and on
 *         dynamic insertion (mutation observer).
 *      B) Open programmatically:
 *           FrameworkViewer.open({ slibrary: 1, sheet: 1 });
 *
 * ------------------------------------------------------------------------
 * PROTECTION
 * ------------------------------------------------------------------------
 *   - PDF rendered to canvas only (no text layer = no text selection)
 *   - Right-click, copy, drag, Ctrl+P/S/C/A/U all blocked while viewer open
 *   - @media print rule redacts viewer in print preview
 *   - Diagonal "© Dr. H. Haas · MDGTB301 · For course use only" watermark
 *   These are deterrents, not absolute. Screenshots remain possible.
 * ============================================================================ */

(function (global) {
  'use strict';

  // --------------------------------------------------------------------------
  // CONFIG
  // --------------------------------------------------------------------------
  var PDF_URL = global.FW_PDF_URL || 'framework-library.pdf';
  var PDFJS_VERSION = '3.11.174';
  var PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VERSION + '/pdf.min.js';
  var PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VERSION + '/pdf.worker.min.js';
  var WATERMARK_TEXT = '© Dr. H. Haas · MDGTB301 · For course use only';
  var BASE_SCALE = 1.5;

  // --------------------------------------------------------------------------
  // FRAMEWORK CATALOG  ·  100 frameworks · slibrary 1-20, sheet 1-5
  // Used to populate the viewer toolbar title when a caller doesn't pass one.
  // --------------------------------------------------------------------------
  var CATALOG = {
    1:  { unit: 1, name: 'Digital Transformation',          sheets: ['Atoms → Bits', 'OECD 3-Layer Model', 'S-Curve of Adoption', 'Gartner Hype Cycle', 'Digitisation · Digitalisation · DT'] },
    2:  { unit: 1, name: 'Digital Economy Data',            sheets: ['UNCTAD Digital Trade Flows', 'ICT Sector % of GDP', 'Global Internet Penetration', 'DCO Regional Digital Trends', 'The Digital Divide Gap'] },
    3:  { unit: 1, name: 'Technology & Ecosystems',         sheets: ['Platform vs. Pipeline', 'SMAC Stack', 'Iansiti-Levien Ecosystem Patterns', 'Network Effects', 'Super-App Model'] },
    4:  { unit: 1, name: 'Disruption Patterns',             sheets: ["Christensen's Disruption", 'Industry Digitization Index', 'BCG 10-20-70 Rule', 'Before/After: Music · Retail · Finance', 'WEF Future of Jobs'] },
    5:  { unit: 2, name: 'E-Business Architecture',         sheets: ['E-Business vs E-Commerce', 'Digital Infrastructure Stack', 'B2B / B2C / C2C / B2G Models', 'API Economy', 'Cloud Computing — IaaS, PaaS, SaaS'] },
    6:  { unit: 2, name: 'Digital Networks',                sheets: ["Metcalfe's Law", 'Direct & Indirect Network Effects', 'Two-Sided Markets', 'Connection Density (MIT)', 'Tipping Point'] },
    7:  { unit: 2, name: 'Digital Value Creation',          sheets: ['Value Chain → Value Network', 'Freemium Model', 'Subscription Models', 'Data as Asset', 'Long Tail'] },
    8:  { unit: 2, name: 'Information Goods',               sheets: ['Zero Marginal Cost', 'Experience Goods', 'Versioning', 'Price Discrimination', 'Lock-In & Switching Costs'] },
    9:  { unit: 3, name: 'Market Structures',               sheets: ['Winner-Takes-All Markets', 'Two-Sided Markets — Market Structure View', 'Multi-Sided Platforms', 'Marketplace vs. Platform', 'GAFAM Concentration'] },
    10: { unit: 3, name: 'Digital Verticals',               sheets: ['Fintech', 'Legaltech', 'Insurtech', 'Regtech', 'Proptech'] },
    11: { unit: 3, name: 'Platform Economics',              sheets: ['Chicken-and-Egg Problem', 'Subsidised Side Pricing', 'Platform Governance', 'Switching Costs in Platforms', 'Data Economies of Scale'] },
    12: { unit: 3, name: 'Market Failures & Regulation',    sheets: ['DMA — Digital Markets Act', 'DSA — Digital Services Act', 'Antitrust in Digital Markets', 'Algorithmic Collusion', 'Essential Facilities Doctrine'] },
    13: { unit: 4, name: 'Digital Transformation Strategy', sheets: ['BCG 10-20-70 Rule', 'McKinsey 7S — Digital Edition', 'Digital Maturity Model', 'Transformation Roadmap', 'Change Resistance'] },
    14: { unit: 4, name: 'The Future of Work',              sheets: ['Reskilling vs. Upskilling', 'Task Automation Potential', 'Step-Function AI Impact (MIT)', 'Gig Economy Platforms', 'Skills Matrix 2025-2030'] },
    15: { unit: 4, name: 'AI in Business',                  sheets: ['AI Spectrum', 'Generative AI Economics', 'AI ROI — The $252B Question (MIT)', 'Human-AI Pairing (MIT)', 'Cognitive Trade-Off (MIT)'] },
    16: { unit: 4, name: 'The New Consumer',                sheets: ['5A Framework (Kotler)', 'ZMOT — Zero Moment of Truth', 'Hyper-Personalisation', 'Customer Journey Loop', 'Experience Economy'] },
    17: { unit: 5, name: 'Data Rights & Privacy',           sheets: ['GDPR Principles', 'Personal Data as Property', 'Consent & Legitimate Interest', 'Data Minimisation', 'Right to be Forgotten'] },
    18: { unit: 5, name: 'Intellectual Property',           sheets: ['Copyright in the Digital Age', 'Creative Commons', 'Patent Trolls', 'AI & Copyright', 'Trade Secrets vs Patents'] },
    19: { unit: 5, name: 'Surveillance Capitalism',         sheets: ["Zuboff's Definition", 'Behavioural Futures Markets', 'Data Extraction Imperative', 'Instrumentarian Power', 'Privacy Equation (MIT)'] },
    20: { unit: 5, name: 'AI Ethics & Governance',          sheets: ['EU AI Act', 'Algorithmic Bias', 'Responsibility Gap', 'AI Risk & Mitigation Matrix (MIT)', 'Human-Centered AI Blueprint (MIT)'] }
  };

  // --------------------------------------------------------------------------
  // STATE
  // --------------------------------------------------------------------------
  var pdfDoc = null;
  var currentPage = null;
  var currentZoom = 1.0;
  var pdfjsConfigured = false;
  var pdfjsLoading = null;       // promise

  // DOM refs (set during ensureViewerDOM)
  var overlay, toolbarTitle, canvasArea, loadingEl, zoomInBtn, zoomOutBtn, zoomFitBtn, closeBtn, zoomLabel;

  // --------------------------------------------------------------------------
  // PDF.js loader  ·  CDN with deferred load
  // --------------------------------------------------------------------------
  function loadPdfjs() {
    if (typeof pdfjsLib !== 'undefined') return Promise.resolve();
    if (pdfjsLoading) return pdfjsLoading;
    pdfjsLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PDFJS_CDN;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load PDF.js')); };
      document.head.appendChild(s);
    });
    return pdfjsLoading;
  }

  function configurePdfjs() {
    if (pdfjsConfigured) return;
    if (typeof pdfjsLib === 'undefined') return;
    // Respect a pre-set workerSrc (for self-hosted PDF.js or offline environments).
    // Only fall back to the CDN if nothing has been configured yet.
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    }
    pdfjsConfigured = true;
  }

  // --------------------------------------------------------------------------
  // Build viewer DOM lazily (on first open)
  // --------------------------------------------------------------------------
  function ensureViewerDOM() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'fw-viewer-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Framework sheet viewer');
    overlay.innerHTML =
      '<header class="fw-viewer-toolbar">' +
        '<div class="fw-toolbar-left">' +
          '<span class="fw-toolbar-label">Framework Sheet</span>' +
          '<span class="fw-toolbar-title"></span>' +
        '</div>' +
        '<div class="fw-toolbar-controls">' +
          '<button type="button" class="fw-btn" data-fw-action="zoom-out" title="Zoom out">−</button>' +
          '<span class="fw-zoom-display">100%</span>' +
          '<button type="button" class="fw-btn" data-fw-action="zoom-in" title="Zoom in">+</button>' +
          '<button type="button" class="fw-btn" data-fw-action="zoom-fit" title="Fit width">Fit</button>' +
          '<button type="button" class="fw-btn fw-btn-primary" data-fw-action="close">Close</button>' +
        '</div>' +
      '</header>' +
      '<div class="fw-canvas-area">' +
        '<div class="fw-loading">Loading framework sheet…</div>' +
      '</div>';
    document.body.appendChild(overlay);

    toolbarTitle = overlay.querySelector('.fw-toolbar-title');
    canvasArea  = overlay.querySelector('.fw-canvas-area');
    loadingEl   = overlay.querySelector('.fw-loading');
    zoomInBtn   = overlay.querySelector('[data-fw-action="zoom-in"]');
    zoomOutBtn  = overlay.querySelector('[data-fw-action="zoom-out"]');
    zoomFitBtn  = overlay.querySelector('[data-fw-action="zoom-fit"]');
    closeBtn    = overlay.querySelector('[data-fw-action="close"]');
    zoomLabel   = overlay.querySelector('.fw-zoom-display');

    closeBtn.addEventListener('click', close);
    zoomInBtn.addEventListener('click', function () { setZoom(currentZoom + 0.2); });
    zoomOutBtn.addEventListener('click', function () { setZoom(currentZoom - 0.2); });
    zoomFitBtn.addEventListener('click', fitWidth);

    // Protection — scoped to overlay
    overlay.addEventListener('contextmenu', preventDefault);
    overlay.addEventListener('copy', blockCopy);
    overlay.addEventListener('cut', blockCopy);
    overlay.addEventListener('dragstart', preventDefault);
  }

  function preventDefault(e) { e.preventDefault(); return false; }
  function blockCopy(e) {
    e.preventDefault();
    if (e.clipboardData) e.clipboardData.setData('text/plain', '');
    return false;
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  function pageNumberFor(slibrary, sheet) {
    return 7 + (slibrary - 1) * 5 + sheet;
  }

  function resolveTitle(slibrary, sheet, override) {
    if (override) return override;
    var entry = CATALOG[slibrary];
    if (!entry) return 'Framework sheet';
    var name = entry.sheets[sheet - 1];
    return name || ('Slibrary ' + slibrary + ' · Sheet ' + sheet);
  }

  function open(opts) {
    opts = opts || {};
    var slibrary = parseInt(opts.slibrary, 10);
    var sheet    = parseInt(opts.sheet, 10);
    if (!slibrary || !sheet || slibrary < 1 || slibrary > 20 || sheet < 1 || sheet > 5) {
      console.warn('FrameworkViewer.open: invalid coordinates', opts);
      return;
    }

    ensureViewerDOM();

    var title = resolveTitle(slibrary, sheet, opts.title);
    toolbarTitle.textContent = title;

    canvasArea.innerHTML = '';
    canvasArea.appendChild(loadingEl);
    loadingEl.textContent = 'Loading framework sheet…';
    overlay.classList.add('fw-open');
    document.body.classList.add('fw-viewer-active');

    var pageNum = pageNumberFor(slibrary, sheet);

    loadPdfjs().then(function () {
      configurePdfjs();
      if (pdfDoc) return pdfDoc;
      return pdfjsLib.getDocument(PDF_URL).promise.then(function (doc) {
        pdfDoc = doc;
        return doc;
      });
    }).then(function (doc) {
      return doc.getPage(pageNum);
    }).then(function (page) {
      currentPage = page;
      currentZoom = 1.0;
      return renderCurrentPage();
    }).catch(function (err) {
      console.error('Framework viewer error:', err);
      loadingEl.textContent = 'Could not load this framework sheet. Please try again.';
    });
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('fw-open');
    document.body.classList.remove('fw-viewer-active');
    currentPage = null;
    canvasArea.innerHTML = '';
  }

  function renderCurrentPage() {
    if (!currentPage) return Promise.resolve();
    var viewport = currentPage.getViewport({ scale: BASE_SCALE * currentZoom });

    var wrapper = document.createElement('div');
    wrapper.className = 'fw-canvas-wrapper';

    var canvas = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    canvas.setAttribute('aria-label', 'Framework sheet — view only');
    wrapper.appendChild(canvas);

    canvasArea.innerHTML = '';
    canvasArea.appendChild(wrapper);

    var renderTask = currentPage.render({
      canvasContext: canvas.getContext('2d'),
      viewport: viewport
    });
    return renderTask.promise.then(function () {
      zoomLabel.textContent = Math.round(currentZoom * 100) + '%';
    });
  }

  function setZoom(z) {
    z = Math.max(0.5, Math.min(2.5, z));
    if (z === currentZoom) return;
    currentZoom = z;
    renderCurrentPage();
  }

  function fitWidth() {
    if (!currentPage) return;
    var available = canvasArea.clientWidth - 56;
    var baseViewport = currentPage.getViewport({ scale: BASE_SCALE });
    setZoom(available / baseViewport.width);
  }

  // --------------------------------------------------------------------------
  // Auto-wire any element with data-fw-slibrary + data-fw-sheet
  // --------------------------------------------------------------------------
  function wireElement(el) {
    if (el.__fwWired) return;
    el.__fwWired = true;
    el.addEventListener('click', function (e) {
      e.preventDefault();
      open({
        slibrary: el.getAttribute('data-fw-slibrary'),
        sheet:    el.getAttribute('data-fw-sheet'),
        title:    el.getAttribute('data-fw-title') || null
      });
    });
  }

  function wireAll(root) {
    root = root || document;
    var nodes = root.querySelectorAll('[data-fw-slibrary][data-fw-sheet]');
    for (var i = 0; i < nodes.length; i++) wireElement(nodes[i]);
  }

  function init() {
    wireAll();
    // Watch for dynamically inserted triggers (e.g. modals built on demand)
    if (typeof MutationObserver !== 'undefined') {
      var obs = new MutationObserver(function (mutations) {
        for (var m = 0; m < mutations.length; m++) {
          var added = mutations[m].addedNodes;
          for (var n = 0; n < added.length; n++) {
            var node = added[n];
            if (node.nodeType !== 1) continue;
            if (node.matches && node.matches('[data-fw-slibrary][data-fw-sheet]')) {
              wireElement(node);
            }
            if (node.querySelectorAll) wireAll(node);
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  // Global keyboard guard — Esc closes, Ctrl+P/S/C/A/U blocked while open
  document.addEventListener('keydown', function (e) {
    if (!overlay || !overlay.classList.contains('fw-open')) return;
    var ctrl = e.ctrlKey || e.metaKey;
    var blocked = ['p', 'P', 's', 'S', 'c', 'C', 'a', 'A', 'u', 'U'];
    if (ctrl && blocked.indexOf(e.key) !== -1) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if (e.key === 'Escape') close();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------
  global.FrameworkViewer = {
    open: open,
    close: close,
    catalog: CATALOG,
    version: '1.0.0'
  };

})(window);
