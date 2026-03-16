import { useState } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { DB, STORAGE } from "@/lib/constants";

type Callbacks = {
  refetchCouple: () => void;
  refetchSpace: () => void;
  onClose?: () => void;
  onMutate?: () => void;
};

export function useSpaceActions(callbacks: Callbacks) {
  const [loading, setLoading] = useState(false);

  function notifyAll() {
    callbacks.refetchSpace();
    callbacks.onMutate?.();
  }

  async function handlePauseSpace() {
    setLoading(true);
    const { error } = await supabase.rpc("pause_space");
    setLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    notifyAll();
  }

  async function handleUnpauseSpace() {
    setLoading(true);
    const { error } = await supabase.rpc("unpause_space");
    setLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    notifyAll();
  }

  async function handleRequestDelete() {
    Alert.alert(
      "Eliminar todo",
      "Esto iniciará la eliminación del espacio. Tu pareja tendrá 24h para confirmar o cancelar.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Solicitar eliminación",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const { error } = await supabase.rpc("request_delete_space");
            setLoading(false);
            if (error) { Alert.alert("Error", error.message); return; }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            notifyAll();
          },
        },
      ]
    );
  }

  async function handleCancelDelete() {
    setLoading(true);
    const { error } = await supabase.rpc("cancel_delete_space");
    setLoading(false);
    if (error) { Alert.alert("Error", error.message); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    notifyAll();
  }

  async function deleteSpaceWithPhotos() {
    Alert.alert(
      "Eliminar definitivamente",
      "Se borrarán todas las fotos y entries. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar todo",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const { data: entriesWithPhotos } = await supabase
                .from(DB.TABLES.ENTRIES)
                .select("photo_url")
                .not("photo_url", "is", null);

              if (entriesWithPhotos && entriesWithPhotos.length > 0) {
                const paths = entriesWithPhotos
                  .map((e) => e.photo_url)
                  .filter((p): p is string => !!p && !p.startsWith("http"));
                if (paths.length > 0) {
                  await supabase.storage.from(STORAGE.BUCKET).remove(paths);
                }
              }

              const { error } = await supabase.rpc("confirm_delete_space");
              if (error) { Alert.alert("Error", error.message); return; }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              callbacks.refetchCouple();
              callbacks.refetchSpace();
              callbacks.onMutate?.();
              callbacks.onClose?.();
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  return {
    spaceLoading: loading,
    handlePauseSpace,
    handleUnpauseSpace,
    handleRequestDelete,
    handleCancelDelete,
    deleteSpaceWithPhotos,
  };
}
