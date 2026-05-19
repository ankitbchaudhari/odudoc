import React from "react";
import { View, ScrollView, StyleSheet, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { AuroraBackground, GlassCard, GradientButton, GhostButton, H1, Body, Caption, SectionHeader, COLORS, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import type { DoctorStackParamList } from "../../App";

const theme = ROLE_THEMES.doctor;

export default function ConsultScreen() {
  const route = useRoute<RouteProp<DoctorStackParamList, "Consult">>();
  const nav = useNavigation();
  // In production load the consultation by id from /api/consultations/[id].
  // For now we render the workspace skeleton — voice-Rx, AI assistant,
  // and signing flow are wired by the developer using the existing
  // web endpoints.
  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={() => nav.goBack()}>
            <Text style={{ color: COLORS.text, fontSize: 24 }}>←</Text>
          </Pressable>

          <Caption style={{ color: theme.primaryTint, marginTop: SPACING.md }}>CONSULTATION</Caption>
          <H1>Patient · {route.params.consultationId.slice(0, 8)}</H1>

          <GlassCard glow theme={theme} style={{ marginTop: SPACING.md }}>
            <Caption>VIDEO ROOM</Caption>
            <Body style={{ marginTop: 6 }}>Join the secure video room with the patient.</Body>
            <GradientButton label="📹 Join video room" theme={theme} onPress={() => {/* TODO open Daily/Janus */}} style={{ marginTop: SPACING.md }} />
          </GlassCard>

          <SectionHeader title="AI prescription assistant" />
          <GlassCard>
            <Body>
              Enter symptoms + history; AI returns ranked diagnoses + a draft prescription. Doctor reviews and signs.
            </Body>
            <View style={{ flexDirection: "row", gap: 8, marginTop: SPACING.md }}>
              <GhostButton label="Voice dictate" onPress={() => {/* TODO mic */}} style={{ flex: 1 }} />
              <GhostButton label="Type" onPress={() => {/* TODO form */}} style={{ flex: 1 }} />
            </View>
          </GlassCard>

          <SectionHeader title="Lab + imaging" />
          <GlassCard><Body style={{ opacity: 0.7 }}>Place a lab order or attach imaging. Result-notify the patient when ready.</Body></GlassCard>

          <SectionHeader title="Wrap up" />
          <GradientButton label="Sign and finish" theme={theme} onPress={() => {/* TODO finalise */}} />
          <View style={{ height: SPACING.sm }} />
          <GhostButton label="Reschedule" onPress={() => {/* TODO */}} />

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
});
