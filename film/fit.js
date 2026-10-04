// Exact seats. Every finished contact is a flat face on a flat face.

export const PIECE = {
  pierW: 0.7,
  pierH: 3,
  pierD: 0.7,
  bearingW: 1.1,
  bearingH: 1.8,
  bearingD: 0.7,
  lintelL: 4.4,
  lintelH: 0.4,
  lintelD: 0.7,
  wedgeBase: 0.62,
  wedgeTop: 0.34,
  wedgeH: 1.204,
  wedgeD: 0.7,
  seat: 0.002,
};

const { pierH, lintelH, bearingH, seat } = PIECE;

export const LOCK = {
  pier: [-1.55, 0, 0],
  bearing: [1.48, 0, 0],
  lintel: [0, pierH + lintelH / 2 - seat, 0],
  wedge: [1.28, bearingH - seat, 0],
};
