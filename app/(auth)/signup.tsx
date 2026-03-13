import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Link } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useGoogleAuth } from "@/hooks/use-google-auth";

export default function SignupScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();

  async function handleSignup() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (error) {
      Alert.alert("Error", error.message);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>nuestra</Text>
        <Text style={styles.subtitle}>Crea tu cuenta</Text>

        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          value={displayName}
          onChangeText={setDisplayName}
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creando..." : "Crear cuenta"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
          onPress={signInWithGoogle}
          disabled={googleLoading}
        >
          <Text style={styles.googleButtonText}>
            {googleLoading ? "Conectando..." : "Continuar con Google"}
          </Text>
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>
              ¿Ya tienes cuenta? Inicia sesión
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 40, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 40 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#000",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ddd" },
  dividerText: { marginHorizontal: 12, color: "#999", fontSize: 14 },
  googleButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  googleButtonText: { fontSize: 16, fontWeight: "600", color: "#333" },
  linkButton: { marginTop: 20, alignItems: "center" },
  linkText: { color: "#666", fontSize: 14 },
});
