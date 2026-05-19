import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { AuroraBackground, GlassCard, GradientButton, GhostButton, Badge, H1, Body, Caption, SectionHeader, COLORS, RADII, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { fetchDoctors, type Doctor } from "@shared/api";
import type { RootStackParamList } from "../../App";

const theme = ROLE_THEMES.patient;

export default function DoctorDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "DoctorDetail">>();
  const nav = useNavigation();
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    fetchDoctors().then((list) => {
      setDoctor(list.find((d) => d.id === route.params.doctorId) || null);
    });
  }, [route.params.doctorId]);

  if (!doctor) {
    return (
      <View style={{ flex: 1 }}>
        <AuroraBackground theme={theme} />
        <SafeAreaView style={styles.center}><Body>Loading…</Body></SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={() => nav.goBack()} style={styles.back}>
            <Text style={{ color: COLORS.text, fontSize: 24 }}>←</Text>
          </Pressable>

          <View style={styles.profileBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{doctor.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</Text>
            </View>
            <H1 style={{ marginTop: SPACING.md }}>{doctor.name}</H1>
            <Body style={{ opacity: 0.7 }}>{doctor.specialty}{doctor.city ? ` · ${doctor.city}` : ""}</Body>
            <View style={{ flexDirection: "row", gap: 8, marginTop: SPACING.sm }}>
              <Badge label={`⭐ ${doctor.rating.toFixed(1)} (${doctor.reviewCount})`} color={COLORS.warning} />
              {doctor.instantAvailable && <Badge label="Available now" color={COLORS.success} />}
            </View>
          </View>

          <GlassCard glow theme={theme} style={{ marginTop: SPACING.md }}>
            <Caption>CONSULTATION FEE</Caption>
            <Text style={{ color: COLORS.text, fontSize: 36, fontWeight: "800", marginTop: 4 }}>${doctor.fee}</Text>
            <Caption style={{ opacity: 0.7 }}>per video / in-person session</Caption>
          </GlassCard>

          <SectionHeader title="Book your visit" />
          <GradientButton label="Consult now (video)" theme={theme} onPress={() => {/* TODO: navigate to slot picker */}} />
          <View style={{ height: SPACING.sm }} />
          <GhostButton label="Schedule a later slot" onPress={() => {/* TODO */}} />

          <SectionHeader title="About" />
          <GlassCard>
            <Body>{"Verified council registration. Cross-jurisdiction eligibility checked at booking time per IMC telemedicine guidelines."}</Body>
          </GlassCard>

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: SPACING.lg },
  back: { paddingVertical: SPACING.sm },
  profileBlock: { alignItems: "center", marginTop: SPACING.md },
  avatar: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: theme.primary,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: "#020617", fontWeight: "800", fontSize: 28 },
});
