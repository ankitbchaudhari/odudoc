import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Text,
  Linking,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AuroraBackground,
  GlassCard,
  GhostButton,
  Body,
  Caption,
  H1,
  COLORS,
  RADII,
  SPACING,
} from "@shared/ui";
import { ROLE_THEMES } from "@shared/theme";
import { clearSessionCookie, deleteAccount } from "@shared/api";
import type { DoctorStackParamList } from "../../App";

const theme = ROLE_THEMES.doctor;

const ROWS = [
  { label: "Verification & licence",  emoji: "🛡️" },
  { label: "My availability",          emoji: "🗓️" },
  { label: "Clinics I work at",        emoji: "🏥" },
  { label: "Payout account",           emoji: "🏦" },
  { label: "ID card & QR",             emoji: "🪪" },
  { label: "AI usage & credits",       emoji: "🤖" },
  { label: "Help & support",           emoji: "💬" },
];

export default function DoctorProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<DoctorStackParamList>>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const logout = async () => {
    Alert.alert("Sign out?", "You'll need to sign in again to access your queue.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => {
        await clearSessionCookie();
        nav.reset({ index: 0, routes: [{ name: "Login" }] });
      } },
    ]);
  };

  const confirmDelete = async () => {
    if (!deletePw) { setDeleteErr("Enter your password."); return; }
    setDeleteBusy(true);
    setDeleteErr(null);
    try {
      const r = await deleteAccount(deletePw);
      if (r.ok) {
        await clearSessionCookie();
        setDeleteOpen(false);
        Alert.alert(
          "Account deleted",
          r.message || "Your doctor account has been removed. Patient records you authored remain in their owners' files per healthcare law.",
          [{ text: "OK", onPress: () => nav.reset({ index: 0, routes: [{ name: "Login" }] }) }],
        );
      } else {
        setDeleteErr(
          r.error === "invalid_password" ? "That password didn't match."
          : r.error === "unauthenticated" ? "Please sign in again."
          : "Something went wrong. Email privacy@odudoc.com.",
        );
      }
    } catch {
      setDeleteErr("Network error. Try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackground theme={theme} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <H1>Profile</H1>

          <GlassCard glow theme={theme} style={{ marginTop: SPACING.md }}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={{ color: "#020617", fontSize: 22, fontWeight: "800" }}>Dr</Text>
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Body style={{ fontWeight: "700" }}>Verified clinician</Body>
                <Caption>Council registration on file · IMC telemedicine compliant</Caption>
              </View>
            </View>
          </GlassCard>

          <View style={{ marginTop: SPACING.md, gap: 6 }}>
            {ROWS.map((r) => (
              <Pressable key={r.label} style={styles.row}>
                <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
                <Body style={{ flex: 1, marginLeft: SPACING.md, fontWeight: "600" }}>{r.label}</Body>
                <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>›</Text>
              </Pressable>
            ))}
          </View>

          <GhostButton
            label="Open doctor dashboard on web"
            onPress={() => Linking.openURL("https://www.odudoc.com/dashboard/doctor")}
            style={{ marginTop: SPACING.lg }}
          />
          <GhostButton label="Sign out" onPress={logout} style={{ marginTop: SPACING.sm }} />

          {/* Apple rule 5.1.1(v) + Google Play User Data policy:
              in-app account deletion is mandatory. */}
          <Pressable
            onPress={() => setDeleteOpen(true)}
            style={styles.deleteBtn}
            accessibilityLabel="Delete account"
          >
            <Text style={styles.deleteBtnText}>Delete account</Text>
          </Pressable>

          <Caption style={{ textAlign: "center", marginTop: SPACING.lg, opacity: 0.5 }}>
            OduDoc for Doctors · operated by Sarjudas Digital Trading and Escrow Services LLC.
          </Caption>

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={deleteOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !deleteBusy && setDeleteOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Delete your doctor account?</Text>
            <Text style={styles.modalBody}>
              This is permanent. Open consultations must be completed or
              reassigned before deletion. Prescriptions and clinical notes
              you authored remain in patient records per the IMC retention
              rules — they cannot be unilaterally erased.
            </Text>
            <Text style={styles.modalLabel}>Confirm with your password</Text>
            <TextInput
              value={deletePw}
              onChangeText={setDeletePw}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              style={styles.modalInput}
              editable={!deleteBusy}
            />
            {deleteErr && <Text style={styles.modalError}>{deleteErr}</Text>}
            <View style={{ marginTop: SPACING.md, gap: SPACING.sm }}>
              <Pressable
                onPress={confirmDelete}
                disabled={deleteBusy}
                style={[styles.modalDangerBtn, deleteBusy && { opacity: 0.6 }]}
              >
                {deleteBusy
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalDangerBtnText}>Permanently delete</Text>}
              </Pressable>
              <Pressable
                onPress={() => { setDeleteOpen(false); setDeletePw(""); setDeleteErr(null); }}
                disabled={deleteBusy}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  profileRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.primary,
    alignItems: "center", justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  deleteBtn: { marginTop: SPACING.lg, paddingVertical: 12, alignItems: "center" },
  deleteBtnText: {
    color: "#fca5a5",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl + SPACING.md,
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: SPACING.sm },
  modalBody: { color: "#cbd5e1", fontSize: 14, lineHeight: 20, marginBottom: SPACING.md },
  modalLabel: {
    color: "#94a3b8", fontSize: 11, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    color: "#fff",
    borderRadius: RADII.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalError: { color: "#fca5a5", fontSize: 13, marginTop: 8 },
  modalDangerBtn: {
    backgroundColor: "#dc2626",
    borderRadius: RADII.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalDangerBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalCancelBtn: { paddingVertical: 12, alignItems: "center" },
  modalCancelBtnText: { color: "#cbd5e1", fontWeight: "600", fontSize: 14 },
});
