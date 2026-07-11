export interface MilestoneConfig {
  id: string;
  depth: number;
  text: string;
}

export const MILESTONES: MilestoneConfig[] = [
  { id: 'm10', depth: 10, text: 'Depth 10 m: The hold has a real mine now.' },
  { id: 'm25', depth: 25, text: 'Depth 25 m: Solid stone. Time to build a brewery.' },
  { id: 'm75', depth: 75, text: 'Depth 75 m: Iron veins! The smelter awaits.' },
  { id: 'm120', depth: 120, text: 'Depth 120 m: Room enough for a Great Hall.' },
  { id: 'm200', depth: 200, text: 'Depth 200 m: Gold! The ancestors smile upon you.' },
  { id: 'm450', depth: 450, text: 'Depth 450 m: Gem hollows glitter in the dark.' },
  { id: 'm700', depth: 700, text: 'Depth 700 m: You found an abandoned hall of the ancestors.' },
  { id: 'm1000', depth: 1000, text: 'Depth 1000 m: Ancient ruins. The air trembles. Dig... carefully.' },
];