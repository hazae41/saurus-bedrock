export const Unreliable = 0;
export const UnreliableSeq = 1;

export const Reliable = 2;
export const ReliableOrd = 3;
export const ReliableSeq = 4;

export const UnreliableACK = 5;
export const ReliableACK = 6;
export const ReliableOrdACK = 7;

export function isReliable(r: number): boolean {
  const array = [
    Reliable,
    ReliableOrd,
    ReliableSeq,
    ReliableACK,
    ReliableOrdACK,
  ];

  return array.includes(r);
}

export function isSequenced(r: number): boolean {
  return [UnreliableSeq, ReliableSeq].includes(r);
}

export function isOrdered(r: number): boolean {
  return [ReliableOrd, ReliableOrdACK].includes(r);
}
