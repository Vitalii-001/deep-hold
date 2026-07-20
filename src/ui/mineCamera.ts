import { create } from 'zustand';

// Camera state for the DOM mine viewport (ui/MineWorld.tsx). Native scrolling
// IS the pan gesture — wheel, touch and scrollbar all work for free — so this
// store only tracks whether we auto-follow the dig face and signals the
// viewport to run an animated scroll (Follow re-centers, Surface jumps to top).
interface MineCameraStore {
  followDepth: boolean;
  followReq: number; // bumped on each Follow click; the viewport animates to the dig face
  surfaceReq: number; // bumped on each Surface click; the viewport animates to the top
  follow: () => void; // re-enable auto-follow (Follow button, Mine Entrance)
  breakFollow: () => void; // the user grabbed the scroll — stop auto-following
  jumpToSurface: () => void;
}

export const useMineCamera = create<MineCameraStore>()((set) => ({
  followDepth: true,
  followReq: 0,
  surfaceReq: 0,
  follow: () => set((c) => ({ followDepth: true, followReq: c.followReq + 1 })),
  breakFollow: () => set({ followDepth: false }),
  jumpToSurface: () => set((c) => ({ followDepth: false, surfaceReq: c.surfaceReq + 1 })),
}));
