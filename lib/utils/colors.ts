// Speaker color palette - matches CSS variables
export const SPEAKER_COLORS = [
  {
    name: 'Cyan',
    bg: 'bg-cyan-500/15',
    bgSolid: 'bg-cyan-500',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    ring: 'ring-cyan-500/30',
  },
  {
    name: 'Emerald',
    bg: 'bg-emerald-500/15',
    bgSolid: 'bg-emerald-500',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    ring: 'ring-emerald-500/30',
  },
  {
    name: 'Purple',
    bg: 'bg-purple-500/15',
    bgSolid: 'bg-purple-500',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    ring: 'ring-purple-500/30',
  },
  {
    name: 'Amber',
    bg: 'bg-amber-500/15',
    bgSolid: 'bg-amber-500',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    ring: 'ring-amber-500/30',
  },
  {
    name: 'Coral',
    bg: 'bg-red-400/15',
    bgSolid: 'bg-red-400',
    text: 'text-red-400',
    border: 'border-red-400/30',
    ring: 'ring-red-400/30',
  },
  {
    name: 'Indigo',
    bg: 'bg-indigo-500/15',
    bgSolid: 'bg-indigo-500',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    ring: 'ring-indigo-500/30',
  },
  {
    name: 'Teal',
    bg: 'bg-teal-500/15',
    bgSolid: 'bg-teal-500',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    ring: 'ring-teal-500/30',
  },
  {
    name: 'Pink',
    bg: 'bg-pink-500/15',
    bgSolid: 'bg-pink-500',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    ring: 'ring-pink-500/30',
  },
];

/**
 * Get color classes for a speaker index
 */
export function getSpeakerColor(index: number) {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

/**
 * Assign colors to speakers, keeping consistent assignments
 */
export function assignSpeakerColors(speakers: string[]): Record<string, number> {
  const assignments: Record<string, number> = {};
  speakers.forEach((speaker, idx) => {
    assignments[speaker] = idx % SPEAKER_COLORS.length;
  });
  return assignments;
}
