import React from "react";
import { View, ScrollView, StyleSheet, Pressable, Text, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuroraBackground, GlassCard, GhostButton, Body, Caption, H1, RADII, SPACING, COLORS } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { clearSessionCookie } from "@shared/api";
import type { RootStackParamList } from "../../App";

const theme = ROLE_THEMES.patient;

const ROWS = [
  { label: "Personal details",       emoji: "👤", to: "personal" },
  { label: "Insurance",              emoji: "🛡️", to: "insurance" },
  { label: "Wearables sync",         emoji: "⌚", to: "wearables" },
  { label: "Sharing & privacy",      emoji: "🔒", to: "sharing" },
  { label: "Help & support",         emoji: "💬", to: "help" },
  { label: "About OduDoc",           emoji: "ℹ️", to: "about" },
];

export default function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const logout = async () => {
    Alert.alert("Sign out?", "You'll need to sign in again to view your records.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => {
        await clearSessionCookie();
        nav.reset({ index: 0, routes: [{ name: "Welcome" }] });
      } },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <H1>Profile</H1>

          <GlassCard style={{ marginTop: SPACING.md }}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={{ color: "#020617", fontWeight: "800", fontSize: 22 }}>U</Text>
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Body style={{ fontWeight: "700" }}>Signed in</Body>
                <Caption>Manage your account, sync wearables, set privacy controls.</Caption>
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
            label="Open OduDoc website"
            onPress={() => Linking.openURL("https://www.odudoc.com")}
            style={{ marginTop: SPACING.lg }}
          />
          <GhostButton
            label="Sign out"
            onPress={logout}
            style={{ marginTop: SPACING.sm }}
          />

          <Caption style={{ textAlign: "center", marginTop: SPACING.lg, opacity: 0.5 }}>
            OduDoc is a brand operated by Sarjudas Digital Trading and Escrow Services LLC.
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
    width: 48, height: 48, borderRadius: 24,
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
