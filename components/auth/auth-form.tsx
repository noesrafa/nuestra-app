import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { useTheme } from "@/hooks/use-theme";
import { spacing } from "@/constants/theme";

export function AuthForm() {
  const { colors } = useTheme();
  const { signInWithGoogle, loading } = useGoogleAuth();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.inner}>
        <Text style={[styles.title, { color: colors.text }]}>nuestra</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          El calendario de tu relación
        </Text>

        <TouchableOpacity
          style={[styles.googleButton, { borderColor: colors.border, backgroundColor: colors.background }, loading && styles.buttonDisabled]}
          onPress={signInWithGoogle}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Image
            source={require("../../assets/logos/google_logo.png")}
            style={styles.googleLogo}
            contentFit="contain"
          />
          <Text style={[styles.googleButtonText, { color: colors.text }]}>
            {loading ? "Conectando..." : "Continuar con Google"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 48,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleLogo: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
