import React, { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuroraBackground, GlassCard, Badge, H1, Body, Caption, COLORS, RADII, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";

const theme = ROLE_THEMES.doctor;

// Stub list — the developer wires this to /api/doctor/patients
// (existing in the web admin) which returns deduped patient records
// for the calling clinician.
const STUB = [
  { id: "p1", name: "Aarav Sharma",  age: 8,  lastSeen: "2026-05-14", condition: "Asthma follow-up" },
  { id: "p2", name: "Meera Iyer",    age: 34, lastSeen: "2026-05-10", condition: "Migraine review" },
  { id: "p3", name: "Riya Khan",     age: 27, lastSeen: "2026-04-28", condition: "PCOS management" },
  { id: "p4", name: "Vikram Shah",   age: 58, lastSeen: "2026-04-21", condition: "Hypertension" },
];

export default function PatientsScreen() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return STUB;
    return STUB.filter((p) => p.name.toLowerCase().includes(term) || p.condition.toLowerCase().includes(term));
  }, [q]);

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <H1>Patients</H1>
          <Body style={{ opacity: 0.7 }}>Everyone you&apos;ve consulted.</Body>

          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by name or condition…"
            placeholderTextColor={COLORS.textDim}
            style={styles.input}
          />

          {filtered.map((p) => (
            <GlassCard key={p.id} style={{ marginBottom: SPACING.sm }}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={{ color: "#020617", fontWeight: "800" }}>{p.name[0]}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Body style={{ fontWeight: "700" }}>{p.name}</Body>
                  <Caption>Age {p.age} · Last seen {p.lastSeen}</Caption>
                  <Caption style={{ color: theme.primaryTint }}>{p.condition}</Caption>
                </View>
                <Badge label="EMR" color={theme.accent} />
              </View>
            </GlassCard>
          ))}

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  input: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: RADII.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  row: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.primary,
    alignItems: "center", justifyContent: "center",
  },
});
