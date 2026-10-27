// Figma Plugin API script for the use_figma tool. Rebuilds rendered slides as editable frames.
// make-script.mjs prepends the inputs:
//   const DATA = { sections: [{ title, note, y, layers }] }  // layers = out/<spec>/layers.json
//   const LOGO_ID = "<component id>"                          // from the setup script
//   const PHOTO_HASHES = { J123: "<imageHash>", ... }          // empty until photos are uploaded
// Photos without a hash get a labelled placeholder frame named "photo/<id>".

const FONT_STYLES = { 400: "Regular", 500: "Medium", 600: "Semi Bold", 700: "Bold" };
const fontFor = (l) =>
  l.font === "DM Serif Display"
    ? { family: "DM Serif Display", style: "Regular" }
    : { family: "Inter", style: FONT_STYLES[l.weight] || "Regular" };

const rgba = (css) => {
  const p = css.match(/rgba?\(([^)]+)\)/)[1].split(",").map((s) => parseFloat(s));
  return { color: { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255 }, a: p.length > 3 ? p[3] : 1 };
};
const solid = (css, opacity = 1) => {
  const { color, a } = rgba(css);
  return { type: "SOLID", color, opacity: a * opacity };
};
const setRadii = (node, r) => {
  if (!r) return;
  [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius] = r;
};

// linear-gradient(...) top to bottom, with or without explicit stop positions.
const gradientPaint = (css) => {
  const stops = [...css.matchAll(/(rgba?\([^)]+\))\s*([\d.]+%)?/g)];
  return {
    type: "GRADIENT_LINEAR",
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: stops.map((m, i) => {
      const { color, a } = rgba(m[1]);
      const position = m[2] ? parseFloat(m[2]) / 100 : i / Math.max(stops.length - 1, 1);
      return { position, color: { ...color, a } };
    }),
  };
};

// CSS background-size: cover + background-position: X% Y%, expressed as a Figma CROP transform.
const photoPaint = (l, hash) => {
  const { w: iw, h: ih } = l.natural;
  const s = Math.max(l.w / iw, l.h / ih);
  const sw = iw * s, sh = ih * s;
  const [fx, fy] = l.focus.split(/\s+/).map((v) => parseFloat(v) / 100);
  const px = (l.w - sw) * fx, py = (l.h - sh) * fy;
  return {
    type: "IMAGE", imageHash: hash, scaleMode: "CROP",
    imageTransform: [[l.w / sw, 0, -px / sw], [0, l.h / sh, -py / sh]],
  };
};

const shadowEffect = (css) => {
  const color = css.match(/rgba?\([^)]+\)/)[0];
  const nums = css.replace(color, "").match(/-?[\d.]+px/g).map(parseFloat);
  const { color: c, a } = rgba(color);
  return { type: "DROP_SHADOW", color: { ...c, a }, offset: { x: nums[0], y: nums[1] }, radius: nums[2] || 0, spread: 0, visible: true, blendMode: "NORMAL" };
};

const fonts = [
  { family: "DM Serif Display", style: "Regular" },
  { family: "Inter", style: "Regular" },
  { family: "Inter", style: "Medium" },
  { family: "Inter", style: "Semi Bold" },
];
await Promise.all(fonts.map((f) => figma.loadFontAsync(f)));

const logo = LOGO_ID ? await figma.getNodeByIdAsync(LOGO_ID) : null;
const created = [];
const placeholders = [];

for (const section of DATA.sections) {
  const { size, slides } = section.layers;
  const [W, H] = size;
  const gap = 80, pad = 100;
  const node = figma.createSection();
  node.name = section.title;
  node.x = 0;
  node.y = section.y;
  node.resizeWithoutConstraints(pad * 2 + slides.length * W + (slides.length - 1) * gap, pad * 2 + H + 60);
  created.push(node.id);

  if (section.note) {
    const note = figma.createText();
    note.fontName = { family: "Inter", style: "Medium" };
    note.characters = section.note;
    note.fontSize = 28;
    note.fills = [solid("rgb(20, 20, 20)", 0.7)];
    note.x = pad;
    note.y = 40;
    node.appendChild(note);
  }

  slides.forEach((slide, i) => {
    const frame = figma.createFrame();
    frame.name = `${section.layers.spec} · ${slide.name}`;
    frame.resize(W, H);
    frame.fills = [solid(slide.background)];
    frame.clipsContent = true;
    frame.x = pad + i * (W + gap);
    frame.y = pad + 60;
    node.appendChild(frame);

    for (const l of slide.layers) {
      if (l.kind === "photo") {
        const ph = figma.createFrame();
        ph.name = `photo/${l.photo}`;
        ph.resize(l.w, l.h);
        ph.x = l.x;
        ph.y = l.y;
        ph.clipsContent = true;
        setRadii(ph, l.radii);
        const hash = PHOTO_HASHES[l.photo];
        if (hash && l.natural) {
          ph.fills = [photoPaint(l, hash)];
        } else {
          ph.fills = [solid("rgb(201, 194, 184)")];
          const label = figma.createText();
          label.name = "placeholder-label";
          label.fontName = { family: "Inter", style: "Semi Bold" };
          label.characters = `Photo ${l.photo} · focus ${l.focus}`;
          label.fontSize = Math.max(14, Math.min(28, l.w / 14));
          label.fills = [solid("rgb(20, 20, 20)", 0.6)];
          ph.appendChild(label);
          label.x = Math.max(8, (l.w - label.width) / 2);
          label.y = (l.h - label.height) / 2;
          placeholders.push(ph.id);
        }
        frame.appendChild(ph);
      } else if (l.kind === "gradient" || l.kind === "box" || l.kind === "line") {
        const rect = figma.createRectangle();
        rect.name = l.kind === "gradient" ? "shade" : l.kind;
        rect.resize(Math.max(l.w, 0.01), Math.max(l.h, 0.01));
        rect.x = l.x;
        rect.y = l.y;
        setRadii(rect, l.radii);
        rect.fills = [l.kind === "gradient" ? gradientPaint(l.css) : solid(l.fill || l.color)];
        frame.appendChild(rect);
      } else if (l.kind === "logo" && logo) {
        // Fit the logo into the box the renderer used, keeping it against the nearer frame edge.
        const inst = logo.createInstance();
        inst.rescale(Math.min(l.w / inst.width, l.h / inst.height));
        inst.x = l.x + (l.x > W / 2 ? l.w - inst.width : 0);
        inst.y = l.y + (l.h - inst.height) / 2;
        const white = rgba(l.color).color.r > 0.5;
        if (white) inst.findAll((n) => n.type === "VECTOR").forEach((v) => (v.fills = [solid("rgb(255, 255, 255)")]));
        frame.appendChild(inst);
      } else if (l.kind === "text") {
        const t = figma.createText();
        t.name = l.role || "text";
        t.fontName = fontFor(l);
        t.characters = l.text;
        t.fontSize = l.size;
        t.lineHeight = { unit: "PIXELS", value: l.lineHeight };
        t.letterSpacing = { unit: "PIXELS", value: l.letterSpacing || 0 };
        if (l.upper) t.textCase = "UPPER";
        t.fills = [solid(l.color, l.opacity)];
        for (const r of l.ranges || []) t.setRangeFills(r.start, r.end, [solid(r.color, l.opacity)]);
        if (l.shadow) t.effects = [shadowEffect(l.shadow)];
        const singleLine = l.h < l.lineHeight * 1.6 && !l.text.includes("\n");
        if (singleLine) {
          t.textAutoResize = "WIDTH_AND_HEIGHT";
        } else {
          t.textAutoResize = "HEIGHT";
          t.resize(Math.ceil(l.w * 1.01), l.h);
        }
        t.x = l.x;
        t.y = l.y;
        frame.appendChild(t);
      }
    }
    created.push(frame.id);
  });
}

return { createdNodeIds: created, placeholderNodeIds: placeholders };
