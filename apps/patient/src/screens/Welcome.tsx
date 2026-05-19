import React from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuroraBackground, GradientButton, GhostButton, H1, Body, SPACING } from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import type { RootStackParamList } from "../../App";

const theme = ROLE_THEMES.patient;

export default function WelcomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.logo}>OduDoc</Text>
          <Body style={styles.tagline}>Healthcare on one tap.</Body>
        </View>

        <View style={styles.heroIllustration}>
          <Text style={{ fontSize: 96 }}>🩺</Text>
        </View>

        <View style={styles.middle}>
          <H1 style={styles.headline}>
            Find doctors,{"\n"}
            <Text style={{ color: theme.primaryTint }}>book in 3 taps.</Text>
          </H1>
          <Body style={styles.sub}>
            Video consults · Lab tests · Family accounts · Anti-counterfeit medicine scanner.
            All under one account.
          </Body>
        </View>

        <View style={styles.actions}>
          <GradientButton label="Get started — free" theme={theme} onPress={() => nav.navigate("Login")} />
          <GhostButton label="I already have an account" onPress={() => nav.navigate("Login")} />
          <Body style={styles.legal}>
            By continuing you agree to our Terms · Privacy Policy.
            Service operated by Sarjudas Digital Trading and Escrow Services LLC.
          </Body>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: SPACING.lg, justifyContent: "space-between" },
  top: { alignItems: "center", marginTop: SPACING.lg },
  logo: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  tagline: { textAlign: "center", marginTop: 4, opacity: 0.7 },
  heroIllustration: { alignItems: "center", marginVertical: SPACING.xxl },
  middle: { marginBottom: SPACING.lg },
  headline: { fontSize: 36, lineHeight: 42, textAlign: "left" },
  sub: { marginTop: SPACING.md, opacity: 0.85, lineHeight: 22 },
  actions: { gap: SPACING.sm, marginBottom: SPACING.md },
  legal: { fontSize: 10, opacity: 0.55, textAlign: "center", marginTop: SPACING.sm },
});
