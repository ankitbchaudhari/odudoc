import React from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuroraBackground, GlassCard, GhostButton, Body, Caption, H1, COLORS, RADII, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { clearSessionCookie } from "@shared/api";
import type { DoctorStackParamList } from "../../App";

const theme = ROLE_THEMES.doctor;

const ROWS = [
  { label: "Verification & licence",  emoji: "🛡️" },
  { label: "My availability",          emoji: "🗓️" },
  { label: "Clinics I work at",        emoji: "🏥" },
  { label: "Payout account",           emoji: "🏦" },
  { label: "ID card & QR",             emoji: "🪪" },
  { label: "AI usage & credits",       emoji: "🤖" },
  { label: "Help & support",           emoji: "💬" },
];

export default function DoctorProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DoctorStackParamList>>();

  const logout = async () => {
    Alert.alert("Sign out?", "You'll need to sign in again to access your queue.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => {
        await clearSessionCookie();
        nav.reset({ index: 0, routes: [{ name: "Login" }] });
      } },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <H1>Profile</H1>

          <GlassCard glow theme={theme} style={{ marginTop: SPACING.md }}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={{ color: "#020617", fontSize: 22, fontWeight: "800" }}>Dr</Text>
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Body style={{ fontWeight: "700" }}>Verified clinician</Body>
                <Caption>Council registration on file · IMC telemedicine compliant</Caption>
              </View>
            </View>
          </GlassCard>

          <View style={{ marginTop: SPACING.md, gap: 6 }}>
            {ROWS.map((r) => (
              <Pressable key={r.label} style={styles.row}>
                <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                <Body style={{ flex: 1, marginLeft: SPACING.md, fontWeight: "600" }}>{r.label}</Body>
                <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>›</Text>
              </Pressable>
            ))}
          </View>

          <GhostButton
            label="Open doctor dashboard on web"
            onPress={() => Linking.openURL("https://www.odudoc.com/dashboard/doctor")}
            style={{ marginTop: SPACING.lg }}
          />
          <GhostButton label="Sign out" onPress={logout} style={{ marginTop: SPACING.sm }} />

          <Caption style={{ textAlign: "center", marginTop: SPACING.lg, opacity: 0.5 }}>
            OduDoc for Doctors · operated by Sarjudas Digital Trading and Escrow Services LLC.
          </Caption>

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.primary,
    alignItems: "center", justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
});
