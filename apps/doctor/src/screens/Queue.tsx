import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuroraBackground, GlassCard, Badge, H1, Body, Caption, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { fetchMyConsultations, type Consultation } from "@shared/api";
import type { DoctorStackParamList } from "../../App";

const theme = ROLE_THEMES.doctor;
const FILTERS = ["awaiting_doctor", "approved", "in_progress", "completed"] as const;
const FILTER_LABEL: Record<typeof FILTERS[number], string> = {
  awaiting_doctor: "Awaiting",
  approved: "Approved",
  in_progress: "In progress",
  completed: "Completed",
};

export default function QueueScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DoctorStackParamList>>();
  const [list, setList] = useState<Consultation[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("awaiting_doctor");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setList(await fetchMyConsultations()); } finally { setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = list.filter((c) => c.status === filter);

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <H1>Queue</H1>
          <Body style={{ opacity: 0.7 }}>Manage your consultation pipeline.</Body>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.chip, filter === f && { backgroundColor: theme.primary }]}
              >
                <Caption style={{ color: filter === f ? "#020617" : undefined, fontWeight: "700" }}>
                  {FILTER_LABEL[f]} · {list.filter((c) => c.status === f).length}
                </Caption>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.accent} />}
        >
          {filtered.length === 0 ? (
            <GlassCard><Body style={{ opacity: 0.7 }}>No consultations in this status.</Body></GlassCard>
          ) : (
            filtered.map((c) => (
              <Pressable key={c.id} onPress={() => nav.navigate("Consult", { consultationId: c.id })} style={{ marginBottom: SPACING.sm }}>
                <GlassCard>
                  <Body style={{ fontWeight: "700" }}>{c.patientName}</Body>
                  <Caption>{c.specialty} · {c.dateLabel} · {c.timeSlot}</Caption>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
                    <Badge label={c.mode === "video" ? "📹 Video" : "💬 Chat"} color={theme.accent} />
                    <Badge label={`$${c.fee}`} color={theme.primary} />
                  </View>
                </GlassCard>
              </Pressable>
            ))
          )}
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  filterRow: { paddingVertical: SPACING.md, gap: SPACING.xs },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    marginRight: 8,
  },
  scroll: { paddingHorizontal: SPACING.lg },
});
