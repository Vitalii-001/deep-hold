// World scale shared by MineWorld and MineActivityLayer (1 m = 6 px).
// Lives in its own module so the activity layer doesn't import MineWorld
// (which mounts the activity layer — that would be a cycle).
export const PX_PER_M = 6;
