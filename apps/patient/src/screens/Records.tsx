import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, RefreshControl, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuroraBackground, GlassCard, Badge, H1, Body, Caption, SectionHeader, RADII, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { fetchMyPrescriptions, type PrescriptionRecord } from "@shared/api";

const theme = ROLE_THEMES.patient;

const QUICK = [
  { label: "Lab reports",          emoji: "🧪" },
  { label: "Vitals & wearables",   emoji: "❤️" },
  { label: "Vaccinations",         emoji: "💉" },
  { label: "Verify medicine",      emoji: "🔍" },
];

export default function RecordsScreen() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setPrescriptions(await fetchMyPrescriptions()); } finally { setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.accent} />}
        >
          <H1>My records</H1>
          <Body style={{ opacity: 0.7, marginBottom: SPACING.md }}>
            Prescriptions, lab reports, vitals, vaccinations — your full health history.
          </Body>

          <View style={styles.quickGrid}>
            {QUICK.map((q) => (
              <Pressable key={q.label} style={styles.quickTile}>
                <Text style={{ fontSize: 26 }}>{q.emoji}</Text>
                <Body style={{ fontWeight: "700", marginTop: 6 }}>{q.label}</Body>
              </Pressable>
            ))}
          </View>

          <SectionHeader title="Prescriptions" />
          {prescriptions.length === 0 ? (
            <GlassCard><Body style={{ opacity: 0.7 }}>No prescriptions yet.</Body></GlassCard>
          ) : (
            prescriptions.map((p) => (
              <GlassCard key={p.id} style={{ marginBottom: SPACING.sm }}>
                <Body style={{ fontWeight: "700" }}>{p.data.diagnosis || "Prescription"}</Body>
                <Caption>by {p.data.doctorName || "—"} · {new Date(p.createdAt).toLocaleDateString()}</Caption>
                <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
                  <Badge label={`${p.data.medications.length} meds`} color={theme.accent} />
                  <Badge label="Download PDF" color={theme.primary} />
                </View>
              </GlassCard>
            ))
          )}

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.md },
  quickTile: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: RADII.lg,
    padding: SPACING.md,
  },
});
