// On-screen text. Headlines: sentence case, five words or fewer, no "!".
// Line breaks are set by hand so the rag stays deliberate.

export const HEADLINES = {
  drawing: ["Start with", "your drawing"],
  cutting: ["Prefabricated", "in-house"],
  edges: ["Your edge,", "your profile"],
  cnc: ["Curved without", "thermoforming"],
  benefits: ["Lighter to ship,", "less waste"],
  endCard: ["Send your drawing"],
} as const;

export const CHECKLIST_ITEMS = ["Cut", "Edged", "Machined", "Curved"] as const;

export const EDGE_PROFILES = ["Bullnose", "Chamfer", "Bevelled"] as const;

export const STACK_LABELS = {
  sheets: "Full sheets",
  parts: "Finished parts",
  offcuts: "Offcuts become new panels",
};

// Join with a non-breaking space before each "·", so a wrapped line ends on
// the separator instead of starting with it.
const spec = (...items: string[]) => items.join("\u00A0· ");

// LinkedIn only: technical lines beneath the headlines.
export const LINKEDIN_SPECS = {
  cutting: spec(
    "Simple shapes for tabletops, seating and more",
    "Panels up to 2800 × 1400 mm",
    "12 or 19 mm",
  ),
  edges: spec(
    "Bullnose",
    "Half-bullnose",
    "Ogee",
    "Chamfer",
    "Bevelled",
    "Eased",
  ),
  cnc: spec(
    "Cut, milled or engraved",
    "Cut-out designs for partitions, walls, backlit panels and ceilings",
  ),
  benefits: spec(
    "Reduce transport weight and shipping costs",
    "Minimise material waste",
  ),
} as const;

export const END_CARD = {
  reels: {
    urls: ["polygood.com/prefabrication"],
  },
  linkedin: {
    urls: ["polygood.com/contact-us", "polygood.com/prefabrication"],
  },
} as const;
