import { useState, useEffect } from "react";
import { useAudioPlayer } from "expo-audio";
import {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

export function useSongPlayer(
  spotifyPreviewUrl: string | null,
  spotifyTrackId: string | null,
  isOpen: boolean
) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(spotifyPreviewUrl);
  const player = useAudioPlayer(previewUrl ? { uri: previewUrl } : null);

  // Vinyl rotation
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const vinylStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Auto-play when modal opens
  useEffect(() => {
    if (isOpen && player && previewUrl) {
      try {
        player.seekTo(0);
        player.play();
      } catch {
        // Preview not available
      }
    }
  }, [isOpen, player, previewUrl]);

  // Fetch preview URL from embed page if not available
  async function fetchPreview() {
    if (previewUrl || !spotifyTrackId) return;
    try {
      const res = await fetch(
        `https://open.spotify.com/embed/track/${spotifyTrackId}`,
        { headers: { Accept: "text/html" } }
      );
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/"audioPreview":\s*\{[^}]*"url":\s*"([^"]+)"/);
        if (match?.[1]) {
          setPreviewUrl(match[1]);
        }
      }
    } catch {
      // No preview available
    }
  }

  function pause() {
    if (player) player.pause();
  }

  return { vinylStyle, fetchPreview, pause };
}
