import React from "react";
import { View, ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuroraBackground, GlassCard, GradientButton, Badge, H1, Body, Caption, COLORS, RADII, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";

const theme = ROLE_THEMES.patient;

// Stub data — wire to /api/family once the endpoint is hooked up
// from the existing web family-store.
const DEPENDENTS = [
  { id: "1", name: "Aarav", relationship: "Son", age: 8, color: "#f97316" },
  { id: "2", name: "Meera", relationship: "Daughter", age: 12, color: "#ec4899" },
  { id: "3", name: "Mom",   relationship: "Mother", age: 62, color: "#a855f7" },
];

export default function FamilyScreen() {
  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <H1>Family</H1>
          <Body style={{ opacity: 0.7, marginBottom: SPACING.md }}>
            Manage profiles for the people you care for. Each gets their own medical record.
          </Body>

          <GlassCard glow theme={theme}>
            <Caption style={{ color: theme.primaryTint }}>ACTIVE PROFILE</Caption>
            <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: "800", marginTop: 4 }}>
              You (self)
            </Text>
            <Caption style={{ opacity: 0.7 }}>All consults + records are tagged to you.</Caption>
          </GlassCard>

          <Caption style={{ marginTop: SPACING.lg, marginBottom: SPACING.sm }}>DEPENDENTS</Caption>
          {DEPENDENTS.map((d) => (
            <Pressable key={d.id} style={{ marginBottom: SPACING.sm }}>
              <GlassCard>
                <View style={styles.depRow}>
                  <View style={[styles.depAvatar, { backgroundColor: d.color }]}>
                    <Text style={{ color: "#fff", fontWeight: "800" }}>{d.name[0]}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.md }}>
                    <Body style={{ fontWeight: "700" }}>{d.name}</Body>
                    <Caption>{d.relationship} · {d.age} yrs</Caption>
                  </View>
                  <Badge label="Switch" color={theme.accent} />
                </View>
              </GlassCard>
            </Pressable>
          ))}

          <GradientButton label="+ Add a dependent" theme={theme} onPress={() => {/* TODO */}} style={{ marginTop: SPACING.md }} />

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  depRow: { flexDirection: "row", alignItems: "center" },
  depAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
});
