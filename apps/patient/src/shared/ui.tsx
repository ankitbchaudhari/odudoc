// Cross-app UI primitives. Used by both Patient + Doctor.
//
// Style language: glassmorphism on a dark slate base, with each
// role's signature gradient leaking through. Big rounded corners
// (16-24px), gradient CTAs, soft shadows.

import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, RADII, SPACING, FONT_SIZES, type RoleTheme } from "./theme";

// ── Aurora background ─────────────────────────────────────────────
//
// Three blurred blobs over a slate-950 base. Pure JSX — no animation
// to keep main-thread cost zero. The gradient stops are role-themed
// so the Patient build glows emerald and Doctor glows violet.

export function AuroraBackground({ theme }: { theme: RoleTheme }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.bg }]} />
      <View
        style={{
          position: "absolute",
          top: -120,
          left: -80,
          width: 360,
          height: 360,
          borderRadius: 200,
          backgroundColor: theme.gradient[0],
          opacity: 0.25,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 200,
          right: -100,
          width: 320,
          height: 320,
          borderRadius: 200,
          backgroundColor: theme.gradient[1],
          opacity: 0.2,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -100,
          left: 80,
          width: 400,
          height: 400,
          borderRadius: 200,
          backgroundColor: theme.gradient[2],
          opacity: 0.18,
        }}
      />
    </View>
  );
}

// ── Glass card ────────────────────────────────────────────────────

export function GlassCard({
  children,
  style,
  glow = false,
  theme,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  theme?: RoleTheme;
}) {
  return (
    <View
      style={[
        styles.glassCard,
        glow && theme && {
          shadowColor: theme.accent,
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Primary CTA (gradient button) ─────────────────────────────────

export function GradientButton({
  label,
  onPress,
  theme,
  disabled,
  loading,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  theme: RoleTheme;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { borderRadius: RADII.lg, overflow: "hidden", opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientBtn, small && { paddingVertical: 10 }]}
      >
        {loading ? (
          <ActivityIndicator color="#020617" />
        ) : (
          <Text style={[styles.gradientBtnText, small && { fontSize: 13 }]}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

// ── Ghost / secondary button ──────────────────────────────────────

export function GhostButton({
  label, onPress, style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.7 }, style]}
    >
      <Text style={styles.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

// ── Pill / badge ──────────────────────────────────────────────────

export function Badge({
  label,
  color = COLORS.info,
  style,
  textStyle,
}: {
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "33", borderColor: color + "66" }, style]}>
      <Text style={[styles.badgeText, { color }, textStyle]}>{label}</Text>
    </View>
  );
}

// ── Common typography ─────────────────────────────────────────────

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}
export function Body({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}
export function Caption({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}

// ── Section header ────────────────────────────────────────────────

export function SectionHeader({
  title,
  action,
  onActionPress,
}: {
  title: string;
  action?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onActionPress && (
        <Pressable onPress={onActionPress}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: RADII.xl,
    padding: SPACING.md,
  },
  gradientBtn: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientBtnText: {
    color: "#020617",
    fontWeight: "800",
    fontSize: 15,
  },
  ghostBtn: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  ghostBtnText: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.subtitle,
    fontWeight: "700",
  },
  sectionAction: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.small,
    fontWeight: "600",
  },
  h1: { color: COLORS.text, fontSize: FONT_SIZES.hero, fontWeight: "800" },
  h2: { color: COLORS.text, fontSize: FONT_SIZES.title, fontWeight: "700" },
  body: { color: COLORS.text, fontSize: FONT_SIZES.body },
  caption: { color: COLORS.textMuted, fontSize: FONT_SIZES.caption },
});

// Convenience re-exports so each screen can pull from one place.
export { COLORS, RADII, SPACING, FONT_SIZES };
