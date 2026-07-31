import { useCallback, useState } from "react";

const STORAGE_KEY = "mlbapp_recently_viewed";
const MAX_ITEMS = 10;

const readStoredList = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState(readStoredList);

  const addRecentlyViewed = useCallback((player) => {
    const playerId = player?.playerId || player?.mlbPlayerId;
    if (!playerId) return;

    const entry = {
      playerId,
      name: player.fullName || player.name,
      team: player.teamName || player.team,
      position: player.position,
      imageUrl: player.imageUrl || player.image,
    };

    setRecentlyViewed((prev) => {
      const withoutDuplicate = prev.filter((p) => p.playerId !== playerId);
      const next = [entry, ...withoutDuplicate].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recentlyViewed, addRecentlyViewed };
}
