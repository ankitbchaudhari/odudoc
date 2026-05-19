import React, { useState } from "react";
import { View, StyleSheet, TextInput, Text, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuroraBackground, GradientButton, GhostButton, H1, Body, Caption, COLORS, RADII, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { api } from "@shared/api";
import type { DoctorStackParamList } from "../../App";

const theme = ROLE_THEMES.doctor;

export default function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DoctorStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api<{ user?: { role?: string } }, { email: string; password: string }>(
        "/api/auth/mobile-login",
        { method: "POST", body: { email, password }, anonymous: true },
      );
      if (!r.ok) {
        const data = r.data as { error?: string };
        setError(data.error || "Invalid email or password");
        return;
      }
      // Reject non-doctor accounts up-front so a patient doesn't end
      // up on the doctor app by accident.
      const data = r.data as { user?: { role?: string } };
      if (data.user?.role && data.user.role !== "doctor" && data.user.role !== "admin") {
        setError("This app is for doctors only. Use the OduDoc patient app instead.");
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
          <Caption style={{ color: theme.primaryTint }}>ODUDOC FOR DOCTORS</Caption>
          <H1 style={{ marginTop: 4 }}>Welcome, Doctor.</H1>
          <Body style={{ opacity: 0.75, marginTop: 4, marginBottom: SPACING.lg }}>
            Sign in to your verified clinician account.
          </Body>

          <View style={styles.field}>
            <Caption>EMAIL</Caption>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="dr.you@example.com"
              placeholderTextColor={COLORS.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
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
          <GhostButton label="Apply to join" onPress={() => {/* TODO open registration URL */}} style={{ marginTop: SPACING.sm }} />
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
