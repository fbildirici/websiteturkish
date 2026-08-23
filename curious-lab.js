/* The Curious Lab — one living visual system, reused in every configuration.
   Nodes drift on their own small orbits; links draw in sequence; the research
   stage morphs between node sets as each scene becomes active. */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var TERMS = {
    DATA: 'quality · shift · provenance',
    MODEL: 'behaviour · uncertainty',
    EVALUATION: 'reliability · robustness',
    EXPLANATION: 'interpretability · understanding',
    HUMAN: 'trust · interaction',
    GOVERNANCE: 'organizations · oversight'
  };

  var DRAW = 760;      // ms to draw one link
  var STAGGER = 420;   // ms between links inside one phase
  var HOLD = 900;      // ms the finished phase stays lit
  var FADE = 520;      // ms the phase takes to fade out

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var systems = [];
  var running = false;

  /* ---------- parsing ---------- */

  // "DATA:-90,MODEL:30" -> [{ key: 'DATA', angle: -90 }, ...]
  function parseNodes(value) {
    return (value || '').split(',').map(function (entry) {
      var parts = entry.split(':');
      return { key: parts[0].trim(), angle: parseFloat(parts[1]) };
    }).filter(function (n) { return n.key && !isNaN(n.angle); });
  }

  // "A>B|B>C; C>A" -> [[['A','B'],['B','C']], [['C','A']]]
  function parseSequence(value) {
    if (!value) return [];
    return value.split(';').map(function (phase) {
      return phase.split('|').map(function (link) {
        var pair = link.split('>');
        return [pair[0].trim(), pair[1].trim()];
      }).filter(function (pair) { return pair[0] && pair[1]; });
    }).filter(function (phase) { return phase.length; });
  }

  /* ---------- building ---------- */

  function buildNode(key) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'tcl-node';
    el.setAttribute('lang', 'en');

    var dot = document.createElement('span');
    dot.className = 'tcl-node-dot';
    dot.setAttribute('aria-hidden', 'true');

    var label = document.createElement('span');
    label.className = 'tcl-node-label';
    label.textContent = key;

    el.appendChild(dot);
    el.appendChild(label);

    if (TERMS[key]) {
      var terms = document.createElement('span');
      terms.className = 'tcl-node-terms';
      terms.textContent = TERMS[key];
      el.appendChild(terms);
    }

    // The node is a disclosure for its own sub-terms, nothing more.
    el.addEventListener('click', function (event) { event.preventDefault(); });
    return el;
  }

  function createSystem(root) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'tcl-links');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('preserveAspectRatio', 'none');
    root.insertBefore(svg, root.firstChild);

    var sys = {
      root: root,
      svg: svg,
      mode: root.getAttribute('data-mode') || 'sequence',
      spokes: root.getAttribute('data-spokes') === 'true',
      nodes: {},
      order: [],
      links: {},
      phases: [],
      t0: performance.now(),
      w: 0,
      h: 0,
      visible: false
    };

    applyConfig(sys, parseNodes(root.getAttribute('data-nodes')), parseSequence(root.getAttribute('data-sequence')), true);
    return sys;
  }

  // Retarget the system onto a (possibly different) set of nodes and links.
  // Shared nodes keep their element and ease to the new angle — that easing is
  // what reads as a morph rather than a swap.
  function applyConfig(sys, nodes, phases, immediate) {
    var wanted = {};
    var seed = -Math.PI / 2;

    nodes.forEach(function (def, index) {
      wanted[def.key] = true;
      var node = sys.nodes[def.key];
      if (!node) {
        node = {
          key: def.key,
          el: buildNode(def.key),
          angle: def.angle,
          targetAngle: def.angle,
          opacity: immediate ? 1 : 0,
          targetOpacity: 1,
          // Each node wanders on its own slow lissajous, seeded per key.
          phaseA: seed + index * 1.7 + def.key.length,
          phaseB: seed + index * 2.3,
          x: 0,
          y: 0
        };
        sys.nodes[def.key] = node;
        sys.root.appendChild(node.el);
      }
      node.targetAngle = def.angle;
      node.targetOpacity = 1;
      if (immediate) {
        node.angle = def.angle;
        node.opacity = 1;
      }
    });

    Object.keys(sys.nodes).forEach(function (key) {
      if (!wanted[key]) sys.nodes[key].targetOpacity = 0;
    });

    sys.order = nodes.map(function (n) { return n.key; });
    sys.phases = phases;

    // Base links: the faint standing network (every consecutive pair, closed).
    // In emit mode nodes travel outward from the core, so the perimeter would
    // fight the story — radial spokes carry it instead.
    var basePairs = [];
    if (sys.mode === 'emit') {
      sys.spokes = true;
    } else {
      for (var i = 0; i < sys.order.length; i++) {
        basePairs.push([sys.order[i], sys.order[(i + 1) % sys.order.length]]);
      }
    }
    phases.forEach(function (phase) {
      phase.forEach(function (pair) {
        var exists = basePairs.some(function (p) {
          return (p[0] === pair[0] && p[1] === pair[1]) || (p[0] === pair[1] && p[1] === pair[0]);
        });
        if (!exists) basePairs.push(pair);
      });
    });

    syncLinks(sys, basePairs);
    sys.t0 = performance.now();
    sys.cycle = cycleLength(phases);
    sys.dirty = true;
  }

  function linkId(a, b) {
    return a < b ? a + '~' + b : b + '~' + a;
  }

  function syncLinks(sys, pairs) {
    var wanted = {};

    pairs.forEach(function (pair) {
      var id = linkId(pair[0], pair[1]);
      wanted[id] = true;
      if (sys.links[id]) return;

      var base = document.createElementNS(SVG_NS, 'path');
      base.setAttribute('class', 'tcl-link-base');
      var live = document.createElementNS(SVG_NS, 'path');
      live.setAttribute('class', 'tcl-link-live');
      live.setAttribute('pathLength', '1');
      sys.svg.appendChild(base);
      sys.svg.appendChild(live);

      sys.links[id] = { from: pair[0], to: pair[1], base: base, live: live, p0: null, c: null, p1: null };
    });

    Object.keys(sys.links).forEach(function (id) {
      if (wanted[id]) return;
      var link = sys.links[id];
      link.base.remove();
      link.live.remove();
      delete sys.links[id];
    });

    if (sys.spokes) {
      sys.order.forEach(function (key) {
        var id = 'spoke~' + key;
        if (sys.spokeEls && sys.spokeEls[id]) return;
        sys.spokeEls = sys.spokeEls || {};
        var line = document.createElementNS(SVG_NS, 'path');
        line.setAttribute('class', 'tcl-link-spoke');
        sys.svg.insertBefore(line, sys.svg.firstChild);
        sys.spokeEls[id] = { key: key, el: line };
      });
    }

    var pulse = sys.pulse;
    if (!pulse) {
      pulse = document.createElementNS(SVG_NS, 'circle');
      pulse.setAttribute('class', 'tcl-pulse');
      pulse.setAttribute('r', '3.4');
      sys.svg.appendChild(pulse);
      sys.pulse = pulse;
    } else {
      sys.svg.appendChild(pulse);
    }
  }

  function cycleLength(phases) {
    var total = 0;
    phases.forEach(function (phase) {
      total += (phase.length - 1) * STAGGER + DRAW + HOLD + FADE;
    });
    return total || 1;
  }

  /* ---------- geometry ---------- */

  function measure(sys) {
    var rect = sys.root.getBoundingClientRect();
    sys.w = rect.width;
    sys.h = rect.height;
    sys.radius = Math.min(sys.w, sys.h) * (sys.mode === 'emit' ? 0.30 : 0.355);
    sys.svg.setAttribute('viewBox', '0 0 ' + sys.w + ' ' + sys.h);
    sys.dirty = true;
  }

  function nodePoint(sys, node, time) {
    var wobble = reduceMotion ? 0 : 1;
    var rad = node.angle * Math.PI / 180;
    // Small independent orbit around the node's anchor point.
    var drift = sys.radius * 0.055 * wobble;
    var dx = Math.cos(time / 3900 + node.phaseA) * drift + Math.cos(time / 6100 + node.phaseB) * drift * 0.6;
    var dy = Math.sin(time / 4600 + node.phaseB) * drift + Math.sin(time / 7300 + node.phaseA) * drift * 0.6;

    var reach = sys.radius;
    if (sys.mode === 'emit') reach = sys.radius * (1 + node.emit * 0.85);

    return {
      x: sys.w / 2 + Math.cos(rad) * reach + dx,
      y: sys.h / 2 + Math.sin(rad) * reach + dy
    };
  }

  function curve(sys, a, b) {
    var mx = (a.x + b.x) / 2;
    var my = (a.y + b.y) / 2;
    var cx = sys.w / 2;
    var cy = sys.h / 2;
    // Bow the chord gently toward the core so links read as routed, not drawn.
    return { x: mx + (cx - mx) * 0.16, y: my + (cy - my) * 0.16 };
  }

  function pathData(a, c, b) {
    return 'M ' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
           ' Q ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) +
           ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
  }

  function quadAt(a, c, b, t) {
    var u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * c.y + t * t * b.y
    };
  }

  /* ---------- per-frame state ---------- */

  function phaseState(sys, elapsed) {
    var t = elapsed % sys.cycle;
    for (var i = 0; i < sys.phases.length; i++) {
      var phase = sys.phases[i];
      var span = (phase.length - 1) * STAGGER + DRAW + HOLD + FADE;
      if (t < span) return { phase: phase, local: t, span: span };
      t -= span;
    }
    return { phase: sys.phases[0] || [], local: 0, span: 1 };
  }

  function update(sys, now) {
    if (!sys.w || !sys.h) measure(sys);

    var elapsed = now - sys.t0;
    var ease = reduceMotion ? 1 : 0.075;

    // Node transforms.
    Object.keys(sys.nodes).forEach(function (key) {
      var node = sys.nodes[key];

      var delta = node.targetAngle - node.angle;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      node.angle += delta * ease;
      node.opacity += (node.targetOpacity - node.opacity) * (reduceMotion ? 1 : 0.09);

      if (sys.mode === 'emit') {
        var cyclePos = ((now / 5200) + (node.phaseA / 6.28)) % 1;
        node.emit = cyclePos;
        node.opacity = node.targetOpacity * Math.sin(cyclePos * Math.PI);
      } else {
        node.emit = 0;
      }

      var p = nodePoint(sys, node, now);
      node.x = p.x;
      node.y = p.y;

      // Labels sit on the outward side so they never cross the links.
      var onLeft = Math.cos(node.angle * Math.PI / 180) < -0.15;
      node.el.classList.toggle('is-left', onLeft);

      // Anchor the dot itself on the ring point, not the node's bounding box.
      var anchorX = onLeft ? 'calc(-100% + 4.5px)' : '-4.5px';
      node.el.style.transform =
        'translate(' + (p.x - sys.w / 2).toFixed(1) + 'px,' + (p.y - sys.h / 2).toFixed(1) + 'px)' +
        ' translate(' + anchorX + ',-50%)';
      node.el.style.opacity = node.opacity.toFixed(3);
      node.el.style.pointerEvents = node.opacity > 0.6 ? 'auto' : 'none';
      if (node.opacity < 0.02) node.el.setAttribute('aria-hidden', 'true');
      else node.el.removeAttribute('aria-hidden');
    });

    // Standing network.
    Object.keys(sys.links).forEach(function (id) {
      var link = sys.links[id];
      var from = sys.nodes[link.from];
      var to = sys.nodes[link.to];
      if (!from || !to) return;
      var a = { x: from.x, y: from.y };
      var b = { x: to.x, y: to.y };
      var c = curve(sys, a, b);
      link.p0 = a; link.c = c; link.p1 = b;
      var d = pathData(a, c, b);
      link.base.setAttribute('d', d);
      link.live.setAttribute('d', d);
      var pairOpacity = Math.min(from.opacity, to.opacity);
      link.base.style.opacity = (pairOpacity * 0.9).toFixed(3);
      link.live.style.opacity = '0';
      link.live.style.strokeDashoffset = '1';
    });

    if (sys.spokeEls) {
      Object.keys(sys.spokeEls).forEach(function (id) {
        var spoke = sys.spokeEls[id];
        var node = sys.nodes[spoke.key];
        if (!node) { spoke.el.style.opacity = '0'; return; }
        spoke.el.setAttribute('d', 'M ' + (sys.w / 2).toFixed(1) + ' ' + (sys.h / 2).toFixed(1) +
                                   ' L ' + node.x.toFixed(1) + ' ' + node.y.toFixed(1));
        spoke.el.style.opacity = (node.opacity * (sys.mode === 'emit' ? 1 : 0.85)).toFixed(3);
      });
    }

    if (reduceMotion) {
      // No sequencing: show the finished network once and leave it alone.
      Object.keys(sys.links).forEach(function (id) {
        var link = sys.links[id];
        link.live.style.strokeDashoffset = '0';
        link.live.style.opacity = sys.mode === 'emit' ? '0' : '0.7';
      });
      if (sys.pulse) sys.pulse.style.opacity = '0';
      return;
    }

    if (sys.mode === 'emit' || !sys.phases.length) {
      if (sys.pulse) sys.pulse.style.opacity = '0';
      return;
    }

    // Active phase: draw, hold, fade.
    var state = phaseState(sys, elapsed);
    var lead = null;
    var leadProgress = 0;

    state.phase.forEach(function (pair, index) {
      var link = sys.links[linkId(pair[0], pair[1])];
      if (!link || !link.p0) return;

      var start = index * STAGGER;
      var draw = Math.max(0, Math.min(1, (state.local - start) / DRAW));
      if (draw <= 0) return;

      var fadeStart = state.span - FADE;
      var alpha = state.local > fadeStart ? Math.max(0, 1 - (state.local - fadeStart) / FADE) : 1;

      link.live.style.opacity = alpha.toFixed(3);
      link.live.style.strokeDashoffset = (1 - easeOut(draw)).toFixed(3);

      if (draw < 1 && alpha === 1) { lead = link; leadProgress = easeOut(draw); }
      else if (!lead && index === state.phase.length - 1 && alpha === 1) { lead = link; leadProgress = 1; }
    });

    if (sys.pulse && lead && leadProgress < 1) {
      var pt = quadAt(lead.p0, lead.c, lead.p1, leadProgress);
      sys.pulse.setAttribute('cx', pt.x.toFixed(1));
      sys.pulse.setAttribute('cy', pt.y.toFixed(1));
      sys.pulse.style.opacity = '1';
    } else if (sys.pulse) {
      sys.pulse.style.opacity = '0';
    }
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function frame(now) {
    var pending = false;
    systems.forEach(function (sys) {
      if (!sys.visible) return;
      if (reduceMotion && !sys.dirty) return;
      update(sys, now);
      if (reduceMotion) sys.dirty = false;
      else pending = true;
    });
    if (pending || !reduceMotion) window.requestAnimationFrame(frame);
    else running = false;
  }

  function ensureRunning() {
    if (running) return;
    running = true;
    window.requestAnimationFrame(frame);
  }

  /* ---------- research-area morph ---------- */

  function initAreaMorph(stageSystem) {
    var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-tcl-scene]'));
    if (!scenes.length || !stageSystem) return;

    var caption = document.querySelector('[data-tcl-caption]');
    var active = null;

    function activate(scene) {
      if (scene === active) return;
      active = scene;
      scenes.forEach(function (s) { s.classList.toggle('is-active', s === scene); });
      applyConfig(
        stageSystem,
        parseNodes(scene.getAttribute('data-nodes')),
        parseSequence(scene.getAttribute('data-sequence')),
        false
      );
      if (caption) caption.textContent = scene.getAttribute('data-caption') || '';
    }

    if (!('IntersectionObserver' in window)) {
      activate(scenes[0]);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      var best = null;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
      });
      if (best) activate(best.target);
    }, { threshold: [0.3, 0.6, 0.9], rootMargin: '-25% 0px -25% 0px' });

    scenes.forEach(function (scene) { observer.observe(scene); });
    activate(scenes[0]);
  }

  /* ---------- how-we-work rail ---------- */

  function initMethodRail() {
    var rail = document.querySelector('[data-tcl-rail]');
    var steps = Array.prototype.slice.call(document.querySelectorAll('[data-tcl-step]'));
    if (!steps.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      steps.forEach(function (s) { s.classList.add('is-active'); });
      if (rail) rail.style.setProperty('--tcl-rail', '1');
      return;
    }

    var lit = 0;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-active');
        observer.unobserve(entry.target);
        lit++;
        if (rail) rail.style.setProperty('--tcl-rail', (lit / steps.length).toFixed(3));
      });
    }, { threshold: 0.45, rootMargin: '0px 0px -12% 0px' });

    steps.forEach(function (step) { observer.observe(step); });
  }

  /* ---------- boot ---------- */

  function init() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-tcl-system]'));
    if (!roots.length) return;

    roots.forEach(function (root) {
      var sys = createSystem(root);
      systems.push(sys);
      if (root.hasAttribute('data-morph')) initAreaMorph(sys);
    });

    var resize;
    window.addEventListener('resize', function () {
      window.clearTimeout(resize);
      resize = window.setTimeout(function () {
        systems.forEach(measure);
        ensureRunning();
      }, 150);
    });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          systems.forEach(function (sys) {
            if (sys.root !== entry.target) return;
            sys.visible = entry.isIntersecting;
            if (entry.isIntersecting) measure(sys);
          });
        });
        ensureRunning();
      }, { rootMargin: '120px' });
      systems.forEach(function (sys) { observer.observe(sys.root); });
    } else {
      systems.forEach(function (sys) { sys.visible = true; });
    }

    systems.forEach(measure);
    ensureRunning();

    initMethodRail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
