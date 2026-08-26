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
    GOVERNANCE: 'organizations · oversight',
    // Reinforcement-learning vocabulary for the RL and XRL configurations.
    ENVIRONMENT: 'state · dynamics',
    POLICY: 'behaviour · control',
    ACTION: 'choice · consequence',
    REWARD: 'signal · objective',
    DECISION: 'sequence · context',
    ORGANIZATION: 'process · responsibility'
  };

  var DRAW = 760;      // ms to draw one link
  var STAGGER = 420;   // ms between links inside one phase
  var HOLD = 900;      // ms the finished phase stays lit
  var FADE = 520;      // ms the phase takes to fade out
  var TRAIL = 5;       // comet-tail samples behind the travelling signal
  var RING = 620;      // ms an arrival ring takes to bloom and fade

  var glowSeq = 0;

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
      liveNodes: true,
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
    sys.liveStep = -1;
    // Under reduced motion the loop parks itself once everything is drawn, so a
    // later morph has to wake it or the new configuration is never painted.
    ensureRunning();
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
      if (sys.arrowRef) live.setAttribute('marker-end', sys.arrowRef);
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

    if (!sys.defs) {
      // A soft bloom makes the constellation read as an instrument display
      // rather than flat vector art.
      var defs = document.createElementNS(SVG_NS, 'defs');
      var filter = document.createElementNS(SVG_NS, 'filter');
      var fid = 'tcl-glow-' + (++glowSeq);
      filter.setAttribute('id', fid);
      filter.setAttribute('x', '-120%');
      filter.setAttribute('y', '-120%');
      filter.setAttribute('width', '340%');
      filter.setAttribute('height', '340%');
      var blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
      blur.setAttribute('stdDeviation', '2.6');
      blur.setAttribute('result', 'b');
      var merge = document.createElementNS(SVG_NS, 'feMerge');
      ['b', 'SourceGraphic'].forEach(function (nm) {
        var mn = document.createElementNS(SVG_NS, 'feMergeNode');
        mn.setAttribute('in', nm);
        merge.appendChild(mn);
      });
      filter.appendChild(blur);
      filter.appendChild(merge);
      defs.appendChild(filter);

      // Arrowhead so the concept graph reads as directed, not just connected.
      var marker = document.createElementNS(SVG_NS, 'marker');
      var mid = 'tcl-arrow-' + glowSeq;
      marker.setAttribute('id', mid);
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '5');
      marker.setAttribute('markerWidth', '5');
      marker.setAttribute('markerHeight', '5');
      marker.setAttribute('orient', 'auto-start-reverse');
      marker.setAttribute('markerUnits', 'strokeWidth');
      var head = document.createElementNS(SVG_NS, 'path');
      head.setAttribute('d', 'M0.5 1.2 L9.2 5 L0.5 8.8 z');
      head.setAttribute('class', 'tcl-arrow-head');
      marker.appendChild(head);
      defs.appendChild(marker);

      sys.svg.insertBefore(defs, sys.svg.firstChild);
      sys.defs = defs;
      sys.glowRef = 'url(#' + fid + ')';
      sys.arrowRef = 'url(#' + mid + ')';
    }

    // Arrival rings: each node can bloom when a link lands on it.
    if (!sys.rings) {
      sys.rings = {};
    }
    sys.order.forEach(function (key) {
      if (sys.rings[key]) return;
      var ring = document.createElementNS(SVG_NS, 'circle');
      ring.setAttribute('class', 'tcl-ring');
      ring.setAttribute('r', '4');
      sys.svg.appendChild(ring);
      sys.rings[key] = { el: ring, t: -1 };
    });

    // The signal gets a short comet tail so its direction is legible.
    if (!sys.trail) {
      sys.trail = [];
      for (var t = 0; t < TRAIL; t++) {
        var c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('class', 'tcl-pulse-trail');
        sys.svg.appendChild(c);
        sys.trail.push(c);
      }
    } else {
      sys.trail.forEach(function (c) { sys.svg.appendChild(c); });
    }

    var pulse = sys.pulse;
    if (!pulse) {
      pulse = document.createElementNS(SVG_NS, 'circle');
      pulse.setAttribute('class', 'tcl-pulse');
      pulse.setAttribute('r', '3.2');
      sys.svg.appendChild(pulse);
      sys.pulse = pulse;
    } else {
      sys.svg.appendChild(pulse);
    }
    if (sys.glowRef) {
      pulse.setAttribute('filter', sys.glowRef);
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
      // Departing nodes clear out faster than arrivals fade in, so a morph
      // never leaves two labels stacked on the same ring position.
      var fade = node.targetOpacity < node.opacity ? 0.20 : 0.07;
      node.opacity += (node.targetOpacity - node.opacity) * (reduceMotion ? 1 : fade);

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

    // Mirror the active phase into the panel's readout and step line.
    if (sys.stepLine) {
      var idx = sys.phases.indexOf(state.phase);
      sys.stepLine.style.setProperty('--tcl-step', (state.local / state.span).toFixed(3));
      if (idx !== sys.liveStep) {
        sys.liveStep = idx;
        var name = state.phase[0]
          ? state.phase[0][0].toLowerCase() + ' \u2192 ' + state.phase[0][1].toLowerCase()
          : '';
        sys.stepLine.textContent = ('0' + (idx + 1)).slice(-2) + '   ' + name;
        if (sys.readout) sys.readout.textContent = name;
      }
    }

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

      // Tail samples sit slightly behind on the same curve.
      if (sys.trail) {
        sys.trail.forEach(function (c, i) {
          var back = Math.max(0, leadProgress - (i + 1) * 0.045);
          var q = quadAt(lead.p0, lead.c, lead.p1, back);
          c.setAttribute('cx', q.x.toFixed(1));
          c.setAttribute('cy', q.y.toFixed(1));
          c.setAttribute('r', (2.6 - i * 0.36).toFixed(2));
          c.style.opacity = (0.42 * (1 - i / TRAIL) * (back > 0 ? 1 : 0)).toFixed(3);
        });
      }

      // Fire the destination ring once, as the signal lands.
      if (leadProgress > 0.93 && sys.rings && sys.rings[lead.to] && sys.rings[lead.to].t < 0) {
        sys.rings[lead.to].t = now;
      }
    } else if (sys.pulse) {
      sys.pulse.style.opacity = '0';
      if (sys.trail) sys.trail.forEach(function (c) { c.style.opacity = '0'; });
    }

    // Arrival rings bloom outward and fade.
    if (sys.rings) {
      Object.keys(sys.rings).forEach(function (key) {
        var ring = sys.rings[key];
        var node = sys.nodes[key];
        if (!node || ring.t < 0) { ring.el.style.opacity = '0'; return; }
        var k = (now - ring.t) / RING;
        if (k >= 1) { ring.t = -1; ring.el.style.opacity = '0'; return; }
        ring.el.setAttribute('cx', node.x.toFixed(1));
        ring.el.setAttribute('cy', node.y.toFixed(1));
        ring.el.setAttribute('r', (4 + easeOut(k) * 13).toFixed(1));
        ring.el.style.opacity = ((1 - k) * 0.55 * node.opacity).toFixed(3);
      });
    }

    // The two nodes on the live link sit slightly forward.
    if (sys.liveNodes !== undefined) {
      Object.keys(sys.nodes).forEach(function (key) {
        var on = lead && (key === lead.from || key === lead.to);
        sys.nodes[key].el.classList.toggle('is-live', !!on);
      });
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

  // Each research area gets its own mechanism drawing. Geometry is built once
  // per topic; the motion itself is CSS, so nothing runs per frame.
  var MECH = {};

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  // XAI — a saliency field: most cells stay quiet, a few carry the weight.
  MECH.saliency = function (svg) {
    var COLS = 9, ROWS = 6, W = 200, H = 120;
    var cw = W / COLS, ch = H / ROWS;
    var hot = { '2,1': 1, '3,1': 1, '3,2': 1, '4,2': 1, '5,3': 1, '4,3': 1, '6,4': 1 };
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var strong = hot[c + ',' + r];
        var cell = svgEl('rect', {
          x: (c * cw + 1.4).toFixed(1), y: (r * ch + 1.4).toFixed(1),
          width: (cw - 2.8).toFixed(1), height: (ch - 2.8).toFixed(1),
          rx: 1.6, 'class': 'tcl-cell' + (strong ? ' is-hot' : '')
        });
        cell.style.setProperty('--d', (c * 0.07 + r * 0.04).toFixed(2) + 's');
        svg.appendChild(cell);
      }
    }
  };

  // RL — a policy rollout: the agent traces a route, then tries another.
  MECH.rollout = function (svg) {
    var COLS = 8, ROWS = 5, W = 200, H = 120;
    var gx = W / (COLS + 1), gy = H / (ROWS + 1);
    for (var r = 1; r <= ROWS; r++) {
      for (var c = 1; c <= COLS; c++) {
        svg.appendChild(svgEl('circle', {
          cx: (c * gx).toFixed(1), cy: (r * gy).toFixed(1), r: 1.3, 'class': 'tcl-grid-dot'
        }));
      }
    }
    var routes = [
      [[1,3],[2,3],[3,2],[4,2],[5,3],[6,4],[7,4],[8,3]],
      [[1,3],[2,4],[3,4],[4,3],[5,2],[6,2],[7,3],[8,3]]
    ];
    routes.forEach(function (route, ri) {
      var d = route.map(function (pt, i) {
        return (i ? 'L' : 'M') + (pt[0] * gx).toFixed(1) + ' ' + (pt[1] * gy).toFixed(1);
      }).join(' ');
      var path = svgEl('path', { d: d, 'class': 'tcl-route', pathLength: 1 });
      path.style.setProperty('--d', (ri * 2.6) + 's');
      svg.appendChild(path);
      var head = svgEl('circle', { r: 2.6, 'class': 'tcl-route-head' });
      head.appendChild(svgEl('animateMotion', {
        dur: '2.6s', begin: (ri * 2.6) + 's', repeatCount: 'indefinite',
        path: d, keyPoints: '0;1', keyTimes: '0;1', calcMode: 'linear'
      }));
      head.style.setProperty('--d', (ri * 2.6) + 's');
      svg.appendChild(head);
    });
  };

  // XRL — a decision tree where one root-to-leaf path is accounted for.
  MECH.trace = function (svg) {
    var W = 200, H = 120;
    var levels = [[0.5], [0.26, 0.74], [0.13, 0.39, 0.61, 0.87]];
    var ys = [16, 60, 104];
    var pts = levels.map(function (row, li) {
      return row.map(function (fx) { return { x: fx * W, y: ys[li] }; });
    });
    var lit = [0, 1, 3];   // the path that gets explained
    pts.forEach(function (row, li) {
      if (li === pts.length - 1) return;
      row.forEach(function (a, ai) {
        pts[li + 1].slice(ai * 2, ai * 2 + 2).forEach(function (b, bi) {
          var onPath = (li === 0 && ai === lit[0] && bi === lit[1]) ||
                       (li === 1 && ai === lit[1] && (ai * 2 + bi) === lit[2]);
          var edge = svgEl('path', {
            d: 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
               ' C' + a.x.toFixed(1) + ' ' + ((a.y + b.y) / 2).toFixed(1) +
               ' ' + b.x.toFixed(1) + ' ' + ((a.y + b.y) / 2).toFixed(1) +
               ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1),
            'class': 'tcl-branch' + (onPath ? ' is-path' : ''), pathLength: 1
          });
          edge.style.setProperty('--d', (li * 0.75) + 's');
          svg.appendChild(edge);
        });
      });
    });
    pts.forEach(function (row, li) {
      row.forEach(function (pt, i) {
        var onPath = (li === 0) || (li === 1 && i === lit[1]) || (li === 2 && i === lit[2]);
        var n = svgEl('circle', {
          cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: onPath ? 3.4 : 2.4,
          'class': 'tcl-branch-node' + (onPath ? ' is-path' : '')
        });
        n.style.setProperty('--d', (li * 0.75) + 's');
        svg.appendChild(n);
      });
    });
  };

  // AI in the World — adoption spreading outward through an organisation.
  MECH.diffusion = function (svg) {
    var W = 200, H = 120, cx = W / 2, cy = H / 2;
    var nodes = [{ x: cx, y: cy, ring: 0 }];
    [{ r: 30, n: 6 }, { r: 54, n: 9 }].forEach(function (band, bi) {
      for (var i = 0; i < band.n; i++) {
        var a = (i / band.n) * Math.PI * 2 + bi * 0.4;
        nodes.push({ x: cx + Math.cos(a) * band.r * 1.45, y: cy + Math.sin(a) * band.r, ring: bi + 1 });
      }
    });
    nodes.forEach(function (n, i) {
      if (!i) return;
      // Ring 1 hangs off the centre; ring 2 attaches to its nearest ring-1 node,
      // so the spread reads as a tree rather than a random web.
      var src = nodes[0];
      if (n.ring === 2) {
        var best = Infinity;
        nodes.forEach(function (m) {
          if (m.ring !== 1) return;
          var d = (m.x - n.x) * (m.x - n.x) + (m.y - n.y) * (m.y - n.y);
          if (d < best) { best = d; src = m; }
        });
      }
      var edge = svgEl('line', {
        x1: src.x.toFixed(1), y1: src.y.toFixed(1),
        x2: n.x.toFixed(1), y2: n.y.toFixed(1), 'class': 'tcl-spread-edge'
      });
      edge.style.setProperty('--d', (n.ring * 0.6) + 's');
      svg.appendChild(edge);
    });
    nodes.forEach(function (n) {
      var c = svgEl('circle', {
        cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: n.ring ? 3 : 4.6, 'class': 'tcl-spread-node'
      });
      c.style.setProperty('--d', (n.ring * 0.6) + 's');
      svg.appendChild(c);
    });
  };

  function buildMech(host, kind) {
    if (!host) return;
    host.textContent = '';
    var build = MECH[kind] || MECH.saliency;
    var svg = svgEl('svg', { viewBox: '0 0 200 120', preserveAspectRatio: 'xMidYMid meet' });
    svg.setAttribute('class', 'tcl-mech-svg tcl-mech-' + kind);
    build(svg);
    host.appendChild(svg);
  }

  /* ---------- research-area morph ---------- */

  function initAreaMorph(stageSystem) {
    var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-tcl-scene]'));
    if (!scenes.length || !stageSystem) return;

    var caption = document.querySelector('[data-tcl-caption]');
    var capTop = document.querySelector('[data-tcl-cap-top]');
    var frames = document.querySelector('[data-tcl-frames]');
    var shot = document.querySelector('[data-tcl-shot]');
    var shotLabel = document.querySelector('[data-tcl-shot-label]');
    var stepLine = document.querySelector('[data-tcl-step-line]');
    var mechHost = document.querySelector('[data-tcl-mech]');
    var mechLabel = document.querySelector('[data-tcl-mech-label]');
    var stripImgs = frames
      ? Array.prototype.slice.call(frames.querySelectorAll('img'))
      : [];

    // Cross-fade rather than swap, so a slow image never shows a blank tile.
    // Every swap carries the generation it belongs to; a load that resolves
    // after a newer scene took over is dropped instead of painted.
    var generation = 0;

    function fadeTo(img, src, gen) {
      if (!img || !src || img.getAttribute('src') === src) return;
      var next = new Image();
      next.onload = function () {
        if (gen !== generation) return;
        img.style.opacity = '0';
        window.setTimeout(function () {
          if (gen !== generation) return;
          img.src = src;
          img.style.opacity = '';
        }, 180);
      };
      next.src = src;
    }

    // The hero is a <video>; swapping it is a load, not an image decode.
    function swapShot(src, label) {
      if (shot && src && shot.getAttribute('src') !== src) {
        var gen = generation;
        shot.style.opacity = '0';
        window.setTimeout(function () {
          if (gen !== generation) return;
          shot.src = src;
          shot.load();
          if (!reduceMotion) {
            var playing = shot.play();
            if (playing && playing.catch) playing.catch(function () {});
          }
          shot.style.opacity = '';
        }, 180);
      }
      if (shotLabel && label) shotLabel.textContent = label;
    }

    function swapStrip(list) {
      stripImgs.forEach(function (img, i) { fadeTo(img, list[i], generation); });
    }

    // Only the step currently drawn is named, and the diagram supplies the
    // text — there is no separate list to fall out of sync.
    function buildSteps(phases) {
      stageSystem.stepLine = stepLine;
      stageSystem.readout = document.querySelector('[data-tcl-readout]');
    }
    var frameLabels = frames
      ? Array.prototype.slice.call(frames.querySelectorAll('.tcl-frame-label'))
      : [];
    var active = null;

    function activate(scene) {
      if (scene === active) return;
      active = scene;
      generation++;
      scenes.forEach(function (s) { s.classList.toggle('is-active', s === scene); });
      applyConfig(
        stageSystem,
        parseNodes(scene.getAttribute('data-nodes')),
        parseSequence(scene.getAttribute('data-sequence')),
        false
      );
      if (caption) caption.textContent = scene.getAttribute('data-caption') || '';
      if (capTop) capTop.textContent = scene.getAttribute('data-cap') || '';

      var labels = (scene.getAttribute('data-frames') || '').split('|');
      frameLabels.forEach(function (el, i) {
        if (!labels[i]) return;
        el.textContent = labels[i];
      });

      buildMech(mechHost, scene.getAttribute('data-mech'));
      if (mechLabel) mechLabel.textContent = scene.getAttribute('data-mech-label') || '';
      swapShot(scene.getAttribute('data-shot'), scene.getAttribute('data-shot-label'));
      swapStrip((scene.getAttribute('data-strip') || '').split('|'));
      buildSteps(parseSequence(scene.getAttribute('data-sequence')));
      if (frames) {
        frames.classList.remove('is-swapping');
        void frames.offsetWidth;   // restart the stagger on every scene change
        frames.classList.add('is-swapping');
      }
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

    // The autoplay attribute fires before any of our code runs, so a
    // reduced-motion visitor has to be handed a still frame explicitly.
    if (reduceMotion) {
      Array.prototype.forEach.call(document.querySelectorAll('video[data-tcl-shot]'), function (v) {
        v.removeAttribute('autoplay');
        v.removeAttribute('loop');
        v.pause();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
