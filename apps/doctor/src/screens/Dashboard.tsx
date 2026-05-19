import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, RefreshControl, Switch, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { AuroraBackground, GlassCard, GradientButton, Badge, H1, Body, Caption, SectionHeader, COLORS, RADII, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { fetchMyConsultations, type Consultation, api } from "@shared/api";
import type { DoctorTabParamList } from "../../App";

const theme = ROLE_THEMES.doctor;

export default function DashboardScreen() {
  const nav = useNavigation<BottomTabNavigationProp<DoctorTabParamList>>();
  const [consults, setConsults] = useState<Consultation[]>([]);
  const [instant, setInstant] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await fetchMyConsultations();
      setConsults(list);
      const r = await api<{ available?: boolean }>("/api/doctor/instant");
      setInstant(!!(r.data as { available?: boolean }).available);
    } finally { setRefreshing(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const toggleInstant = async (next: boolean) => {
    setInstant(next);
    await api("/api/doctor/instant", { method: "POST", body: { minutes: next ? 15 : 0 } });
  };

  const today = new Date().toDateString();
  const todayList = consults.filter((c) => c.dateLabel === today && ["awaiting_doctor", "approved", "in_progress"].includes(c.status));
  const awaiting = consults.filter((c) => c.status === "awaiting_doctor");
  const completedThisMonth = consults.filter((c) => {
    if (c.status !== "completed") return false;
    const d = new Date(c.scheduledFor);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}
        >
          <Caption style={{ color: theme.primaryTint }}>WELCOME BACK</Caption>
          <H1>Dashboard</H1>

          {/* Availability toggle */}
          <GlassCard glow theme={theme} style={{ marginTop: SPACING.md }}>
            <View style={styles.availRow}>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: "700" }}>Instant availability</Body>
                <Caption>{instant ? "Visible in patient instant-consult queue" : "Off — only scheduled bookings will reach you"}</Caption>
              </View>
              <Switch
                value={instant}
                onValueChange={toggleInstant}
                trackColor={{ false: COLORS.border, true: theme.accent }}
                thumbColor={instant ? "#fff" : COLORS.textMuted}
              />
            </View>
          </GlassCard>

          <View style={styles.statGrid}>
            <StatTile label="Awaiting you" value={String(awaiting.length)} hint={awaiting.length ? "Tap to review" : "All clear"} />
            <StatTile label="Today" value={String(todayList.length)} hint="Scheduled" />
            <StatTile label="This month" value={String(completedThisMonth.length)} hint="Completed" />
          </View>

          <SectionHeader title="Today's appointments" />
          {todayList.length === 0 ? (
            <GlassCard><Body style={{ opacity: 0.7 }}>No appointments today.</Body></GlassCard>
          ) : (
            todayList.map((c) => (
              <Pressable key={c.id} onPress={() => nav.getParent()?.navigate("Consult", { consultationId: c.id })} style={{ marginBottom: SPACING.sm }}>
                <GlassCard>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: "700" }}>{c.patientName}</Body>
                      <Caption>{c.timeSlot} · {c.mode === "video" ? "📹 Video" : "💬 Chat"}</Caption>
                    </View>
                    <Badge label={c.status.replace(/_/g, " ")} color={theme.accent} />
                  </View>
                </GlassCard>
              </Pressable>
            ))
          )}

          <GradientButton label="Open full queue →" theme={theme} onPress={() => nav.navigate("Queue")} style={{ marginTop: SPACING.md }} />

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <GlassCard style={styles.statTile}>
      <Caption>{label}</Caption>
      <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: "800", marginTop: 4 }}>{value}</Text>
      <Caption style={{ opacity: 0.7 }}>{hint}</Caption>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  availRow: { flexDirection: "row", alignItems: "center" },
  statGrid: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  statTile: { flex: 1, padding: SPACING.md },
  row: { flexDirection: "row", alignItems: "center" },
});
