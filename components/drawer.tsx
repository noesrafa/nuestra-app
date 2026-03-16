import { useCallback, forwardRef, type ReactNode } from "react";
import { StyleSheet, Dimensions } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useTheme } from "@/hooks/use-theme";

const MAX_DYNAMIC_HEIGHT = Dimensions.get("window").height * 0.85;

type Props = {
  snapPoints?: string[];
  children: ReactNode;
  scrollable?: boolean;
  accentHandle?: boolean;
  accentBackground?: boolean;
};

export const Drawer = forwardRef<BottomSheet, Props>(
  function Drawer({ snapPoints, children, scrollable, accentHandle, accentBackground }, ref) {
    const { colors, isDark } = useTheme();

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.3} />
      ),
      []
    );

    const bgColor = accentBackground && !isDark ? colors.accentLight : colors.surface;
    const handleColor = accentHandle ? colors.accent : colors.border;
    const dynamic = !snapPoints;

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        {...(dynamic
          ? { enableDynamicSizing: true, maxDynamicContentSize: MAX_DYNAMIC_HEIGHT }
          : { snapPoints })}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.bg, { backgroundColor: bgColor }]}
        handleIndicatorStyle={[styles.handle, { backgroundColor: handleColor }]}
      >
        {dynamic ? (
          <BottomSheetScrollView
            contentContainerStyle={scrollable ? styles.scrollContent : styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </BottomSheetScrollView>
        ) : scrollable ? (
          <BottomSheetScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetView style={styles.content}>
            {children}
          </BottomSheetView>
        )}
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  bg: {
    borderRadius: 24,
  },
  handle: {
    width: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    alignItems: "center",
    gap: 10,
    paddingTop: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    paddingTop: 16,
  },
});
