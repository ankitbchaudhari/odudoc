import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, RefreshControl, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { AuroraBackground, GlassCard, GradientButton, Badge, H1, Body, Caption, SectionHeader, COLORS, RADII, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { fetchMyConsultations, fetchMyPrescriptions, type Consultation, type PrescriptionRecord } from "@shared/api";
import type { TabParamList } from "../../App";

const theme = ROLE_THEMES.patient;

const QUICK_TILES = [
  { label: "Find a doctor",    emoji: "🩺", to: "Doctors"  as keyof TabParamList },
  { label: "My records",       emoji: "📋", to: "Records"  as keyof TabParamList },
  { label: "Family",           emoji: "👨‍👩‍👧‍👦", to: "Family"   as keyof TabParamList },
  { label: "Profile",          emoji: "⚙️", to: "Profile"  as keyof TabParamList },
];

export default function DashboardScreen() {
  const nav = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [consults, setConsults] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [c, p] = await Promise.all([fetchMyConsultations(), fetchMyPrescriptions()]);
      setConsults(c);
      setPrescriptions(p);
    } finally { setRefreshing(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const upcoming = consults.filter((c) =>
    ["awaiting_doctor", "approved", "rescheduled", "in_progress"].includes(c.status),
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
        >
          {/* Greeting */}
          <View style={styles.greetingRow}>
            <View>
              <Caption>{greeting}</Caption>
              <H1 style={styles.greetingName}>Hi there 👋</H1>
            </View>
          </View>

          {/* Hero CTA */}
          <GlassCard glow theme={theme} style={{ marginTop: SPACING.md }}>
            <Caption style={{ color: theme.primaryTint }}>FEELING UNWELL?</Caption>
            <Text style={styles.heroTitle}>Book a video consult{"\n"}in under a minute.</Text>
            <GradientButton label="Find a doctor →" theme={theme} onPress={() => nav.navigate("Doctors")} style={{ marginTop: SPACING.md }} />
          </GlassCard>

          {/* Quick stats */}
          <View style={styles.statGrid}>
            <StatTile label="Upcoming" value={String(upcoming.length)} />
            <StatTile label="Records" value={String(prescriptions.length)} />
            <StatTile label="Family" value="—" />
          </View>

          {/* Upcoming */}
          <SectionHeader title="Upcoming appointments" />
          {upcoming.length === 0 ? (
            <GlassCard><Body style={{ opacity: 0.7 }}>No upcoming appointments. Tap “Find a doctor” to book one.</Body></GlassCard>
          ) : (
            upcoming.slice(0, 3).map((c) => (
              <GlassCard key={c.id} style={{ marginBottom: SPACING.sm }}>
                <View style={styles.consultRow}>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: "700" }}>{c.doctorName}</Body>
                    <Caption>{c.specialty} · {c.dateLabel} · {c.timeSlot}</Caption>
                  </View>
                  <Badge label={c.status.replace(/_/g, " ")} color={theme.accent} />
                </View>
              </GlassCard>
            ))
          )}

          {/* Quick tiles */}
          <SectionHeader title="Quick actions" />
          <View style={styles.quickGrid}>
            {QUICK_TILES.map((q) => (
              <Pressable key={q.label} onPress={() => nav.navigate(q.to)} style={styles.quickTile}>
                <Text style={{ fontSize: 28 }}>{q.emoji}</Text>
                <Body style={{ fontWeight: "700", marginTop: 6 }}>{q.label}</Body>
              </Pressable>
            ))}
          </View>

          {/* Recent prescriptions */}
          <SectionHeader title="Recent prescriptions" />
          {prescriptions.length === 0 ? (
            <GlassCard><Body style={{ opacity: 0.7 }}>Prescriptions from your doctors will show up here.</Body></GlassCard>
          ) : (
            prescriptions.slice(0, 3).map((p) => (
              <GlassCard key={p.id} style={{ marginBottom: SPACING.sm }}>
                <Body style={{ fontWeight: "700" }}>{p.data.diagnosis || "Prescription"}</Body>
                <Caption>by {p.data.doctorName || "—"} · {new Date(p.createdAt).toLocaleDateString()}</Caption>
                <View style={{ flexDirection: "row", marginTop: 8 }}>
                  <Badge label={`${p.data.medications.length} med${p.data.medications.length === 1 ? "" : "s"}`} color={theme.accent} />
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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard style={styles.statTile}>
      <Text style={{ color: theme.primaryTint, fontSize: 26, fontWeight: "800" }}>{value}</Text>
      <Caption>{label}</Caption>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  greetingRow: { marginTop: SPACING.md },
  greetingName: { fontSize: 28 },
  heroTitle: { color: COLORS.text, fontSize: 22, fontWeight: "800", marginTop: 8, lineHeight: 28 },
  statGrid: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  statTile: { flex: 1, alignItems: "flex-start", padding: SPACING.md },
  consultRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  quickTile: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: RADII.lg,
    padding: SPACING.md,
  },
});
