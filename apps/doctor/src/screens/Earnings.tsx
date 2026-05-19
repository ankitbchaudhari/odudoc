import React from "react";
import { View, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuroraBackground, GlassCard, GradientButton, H1, Body, Caption, SectionHeader, COLORS, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";

const theme = ROLE_THEMES.doctor;

// Stub figures — wire to /api/doctor/earnings (existing in web admin)
// which returns today / this-month / lifetime totals + the last 30
// days of completed consultations.
const STATS = { today: 240, month: 4820, lifetime: 38500 };
const RECENT = [
  { date: "2026-05-18", patient: "Aarav Sharma",  amount: 25 },
  { date: "2026-05-17", patient: "Meera Iyer",    amount: 40 },
  { date: "2026-05-17", patient: "Riya Khan",     amount: 25 },
  { date: "2026-05-16", patient: "Vikram Shah",   amount: 60 },
];

export default function EarningsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <H1>Earnings</H1>
          <Body style={{ opacity: 0.7 }}>Settled + pending across all clinics.</Body>

          <GlassCard glow theme={theme} style={{ marginTop: SPACING.md }}>
            <Caption style={{ color: theme.primaryTint }}>THIS MONTH</Caption>
            <Text style={{ color: COLORS.text, fontSize: 40, fontWeight: "800", marginTop: 4 }}>${STATS.month}</Text>
            <Caption style={{ opacity: 0.7 }}>Next payout · {new Date().toLocaleDateString()}</Caption>
          </GlassCard>

          <View style={styles.statGrid}>
            <Tile label="Today" value={`$${STATS.today}`} />
            <Tile label="Lifetime" value={`$${STATS.lifetime.toLocaleString()}`} />
          </View>

          <GradientButton label="Download monthly statement" theme={theme} onPress={() => {/* TODO link to PDF */}} style={{ marginTop: SPACING.md }} />

          <SectionHeader title="Recent consultations" />
          {RECENT.map((r, i) => (
            <GlassCard key={i} style={{ marginBottom: SPACING.sm }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Body style={{ fontWeight: "700" }}>{r.patient}</Body>
                  <Caption>{r.date}</Caption>
                </View>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "800" }}>${r.amount}</Text>
              </View>
            </GlassCard>
          ))}

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard style={styles.tile}>
      <Caption>{label}</Caption>
      <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: "800", marginTop: 4 }}>{value}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  statGrid: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  tile: { flex: 1, padding: SPACING.md },
  row: { flexDirection: "row", alignItems: "center" },
});
