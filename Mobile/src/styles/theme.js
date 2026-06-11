// ─── BloodLink Design System — mirrors index.css exactly ─────────────────────

export const theme = {
  colors: {
    // Brand
    primary:     "#E53E3E",
    primaryDark: "#B83232",
    accent:      "#E53E3E",

    // Backgrounds
    bg:          "#F5F7FB",
    surface:     "#FFFFFF",
    surfaceTint: "#FBFCFE",   // matches linear-gradient base on website body
    darkBg:      "#1A1A2E",   // --dark-bg
    cardBg:      "#16213E",   // --card-bg
    navy:        "#1A1A2E",   // --navy

    // Borders / Text
    border:      "#D9E1EC",
    borderLight: "#CFD8E6",
    text:        "#172033",
    textSub:     "#334155",
    muted:       "#647084",

    // Focus ring
    ring:        "rgba(229, 62, 62, 0.16)",

    // Status — success
    successBg:     "#F0FDF4",
    successBorder: "#BBF7D0",
    successText:   "#15803D",
    successBtn:    "#16A34A",
    successBtnShadow: "rgba(22, 163, 74, 0.22)",

    // Status — warning
    warningBg:     "#FFFBEB",
    warningBorder: "#FDE68A",
    warningText:   "#B45309",

    // Status — danger
    dangerBg:     "#FEF2F2",
    dangerBorder: "#FECACA",
    dangerText:   "#B91C1C",
    dangerBtn:    "#DC2626",
    dangerBtnShadow: "rgba(220, 38, 38, 0.16)",

    // Status — info
    infoBg:     "#EFF6FF",
    infoBorder: "#BFDBFE",
    infoText:   "#1D4ED8",

    // Chat bubbles
    bubbleOther: "#EEF3F8",
    bubbleMine:  "#FFE9E6",

    // Misc
    avatarBg:   "#FEE2E2",
    skeletonA:  "#E2E8F0",
    skeletonB:  "#F1F5F9",
    softGray:   "#F8FAFC",
    slate:      "#64748B",
  },

  // ── Shadows — matching box-shadow values from index.css ──────────────────────
  shadows: {
    card: {
      shadowColor:   "#0F172A",
      shadowOffset:  { width: 0, height: 14 },
      shadowOpacity: 0.07,
      shadowRadius:  34,
      elevation:     6,
    },
    cardHover: {
      shadowColor:   "#0F172A",
      shadowOffset:  { width: 0, height: 18 },
      shadowOpacity: 0.09,
      shadowRadius:  42,
      elevation:     8,
    },
    button: {
      shadowColor:   "rgba(192, 57, 43, 0.18)",
      shadowOffset:  { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius:  22,
      elevation:     5,
    },
    buttonDanger: {
      shadowColor:   "#DC2626",
      shadowOffset:  { width: 0, height: 10 },
      shadowOpacity: 0.16,
      shadowRadius:  22,
      elevation:     4,
    },
    buttonOutline: {
      shadowColor:   "#0F172A",
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius:  2,
      elevation:     1,
    },
    sidebarActive: {
      shadowColor:   "rgba(229, 62, 62, 0.18)",
      shadowOffset:  { width: 0, height: 10 },
      shadowOpacity: 1,
      shadowRadius:  22,
      elevation:     4,
    },
    sosPanel: {
      shadowColor:   "#000000",
      shadowOffset:  { width: 0, height: 28 },
      shadowOpacity: 0.35,
      shadowRadius:  80,
      elevation:     20,
    },
    profileMenu: {
      shadowColor:   "#0F172A",
      shadowOffset:  { width: 0, height: 18 },
      shadowOpacity: 0.16,
      shadowRadius:  42,
      elevation:     12,
    },
  },

  // ── Border radii ─────────────────────────────────────────────────────────────
  radius: {
    card:   8,    // 0.5rem
    button: 7,    // 0.45rem
    input:  7,    // 0.45rem
    chip:   7,    // 0.45rem
    tab:    9,    // 0.55rem
    pill:   999,
    badge:  999,
    bubble: 10,   // 0.6rem
  },

  // ── Spacing scale ─────────────────────────────────────────────────────────────
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },

  // ── Typography ────────────────────────────────────────────────────────────────
  type: {
    eyebrow:   { fontSize: 11, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
    label:     { fontSize: 14, fontWeight: "800" },
    body:      { fontSize: 15, fontWeight: "700", lineHeight: 23 },
    caption:   { fontSize: 13, fontWeight: "700" },
    small:     { fontSize: 12, fontWeight: "800" },
    h1:        { fontSize: 26, fontWeight: "900", lineHeight: 34 },
    h2:        { fontSize: 20, fontWeight: "900" },
    h3:        { fontSize: 17, fontWeight: "900" },
    statValue: { fontSize: 24, fontWeight: "900" },
    statLabel: { fontSize: 12, fontWeight: "800" },
  },
};
