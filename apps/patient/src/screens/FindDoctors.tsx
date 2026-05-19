import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, TextInput, RefreshControl, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuroraBackground, GlassCard, Badge, H1, Body, Caption, COLORS, RADII, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { fetchDoctors, type Doctor } from "@shared/api";
import type { RootStackParamList } from "../../App";

const theme = ROLE_THEMES.patient;
const SPECIALTIES = ["All", "General", "Cardiologist", "Dermatologist", "Pediatrician", "Gynecologist", "Psychiatrist"];

export default function FindDoctorsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { setDoctors(await fetchDoctors()); } finally { setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return doctors.filter((d) => {
      if (specialty !== "All" && !d.specialty.toLowerCase().includes(specialty.toLowerCase())) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q);
    });
  }, [doctors, query, specialty]);

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <H1>Find a doctor</H1>
          <Body style={{ opacity: 0.7 }}>Verified clinicians, instant or scheduled.</Body>

          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or specialty…"
              placeholderTextColor={COLORS.textDim}
              style={styles.input}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {SPECIALTIES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSpecialty(s)}
                style={[styles.chip, specialty === s && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              >
                <Text style={[styles.chipText, specialty === s && { color: "#020617" }]}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={theme.accent} />}
        >
          {filtered.length === 0 ? (
            <GlassCard><Body style={{ opacity: 0.7 }}>No doctors match your filters.</Body></GlassCard>
          ) : (
            filtered.map((d) => (
              <Pressable key={d.id} onPress={() => nav.navigate("DoctorDetail", { doctorId: d.id })} style={{ marginBottom: SPACING.sm }}>
                <GlassCard>
                  <View style={styles.doctorRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{d.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Body style={{ fontWeight: "700" }}>{d.name}</Body>
                      <Caption>{d.specialty}{d.city ? ` · ${d.city}` : ""}</Caption>
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                        <Badge label={`⭐ ${d.rating.toFixed(1)}`} color={COLORS.warning} />
                        {d.instantAvailable && <Badge label="Instant" color={COLORS.success} />}
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Body style={{ fontWeight: "800" }}>${d.fee}</Body>
                      <Caption>per consult</Caption>
                    </View>
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
  searchRow: { marginTop: SPACING.md },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: RADII.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  chipRow: { paddingVertical: SPACING.md, gap: SPACING.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  scroll: { paddingHorizontal: SPACING.lg },
  doctorRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.primary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#020617", fontWeight: "800", fontSize: 16 },
});
