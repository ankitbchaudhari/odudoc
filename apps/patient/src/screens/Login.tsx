import React, { useState } from "react";
import { View, StyleSheet, TextInput, Text, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuroraBackground, GradientButton, GhostButton, H1, Body, Caption, COLORS, RADII, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { api } from "@shared/api";
import type { RootStackParamList } from "../../App";

const theme = ROLE_THEMES.patient;

export default function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      // Auth endpoint for native: a dedicated mobile-login route
      // exists on the backend; it returns JSON + sets the cookie.
      const r = await api<{ user?: unknown }, { email: string; password: string }>(
        "/api/auth/mobile-login",
        { method: "POST", body: { email, password }, anonymous: true },
      );
      if (!r.ok) {
        const data = r.data as { error?: string };
        setError(data.error || "Invalid email or password");
        return;
      }
      nav.reset({ index: 0, routes: [{ name: "Main" }] });
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center" }}>
          <H1 style={{ marginBottom: SPACING.xs }}>Welcome back</H1>
          <Body style={{ opacity: 0.75, marginBottom: SPACING.lg }}>Sign in to your OduDoc account.</Body>

          <View style={styles.field}>
            <Caption>EMAIL</Caption>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>
          <View style={styles.field}>
            <Caption>PASSWORD</Caption>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="•••••••••"
              placeholderTextColor={COLORS.textDim}
              secureTextEntry
              style={styles.input}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <GradientButton
            label={busy ? "Signing in…" : "Sign in"}
            onPress={submit}
            theme={theme}
            disabled={!email || !password}
            loading={busy}
            style={{ marginTop: SPACING.md }}
          />
          <GhostButton
            label="Create a free account"
            onPress={() => {/* opens registration URL in browser */}}
            style={{ marginTop: SPACING.sm }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.lg },
  field: { marginBottom: SPACING.md },
  input: {
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  error: {
    color: COLORS.danger,
    backgroundColor: COLORS.danger + "20",
    padding: 12,
    borderRadius: RADII.md,
    fontSize: 13,
    marginBottom: SPACING.sm,
  },
});
