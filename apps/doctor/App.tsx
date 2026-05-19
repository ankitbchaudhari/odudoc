import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "react-native";

import LoginScreen from "./src/screens/Login";
import DashboardScreen from "./src/screens/Dashboard";
import QueueScreen from "./src/screens/Queue";
import PatientsScreen from "./src/screens/Patients";
import EarningsScreen from "./src/screens/Earnings";
import ProfileScreen from "./src/screens/Profile";
import ConsultScreen from "./src/screens/Consult";

import { getSessionCookie } from "@shared/api";
import { COLORS, ROLE_THEMES } from "@shared/theme";

const theme = ROLE_THEMES.doctor;

export type DoctorStackParamList = {
  Login: undefined;
  Main: undefined;
  Consult: { consultationId: string };
};
const Stack = createNativeStackNavigator<DoctorStackParamList>();

export type DoctorTabParamList = {
  Dashboard: undefined;
  Queue: undefined;
  Patients: undefined;
  Earnings: undefined;
  Profile: undefined;
};
const Tab = createBottomTabNavigator<DoctorTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgRaised,
          borderTopColor: COLORS.border,
          paddingTop: 6,
          paddingBottom: 8,
          height: 64,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ color, size }) => {
          const emoji =
            route.name === "Dashboard" ? "🏠" :
            route.name === "Queue"     ? "📋" :
            route.name === "Patients"  ? "👥" :
            route.name === "Earnings"  ? "💰" :
            "⚙️";
          return <Text style={{ fontSize: size - 4, color }}>{emoji}</Text>;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Queue" component={QueueScreen} />
      <Tab.Screen name="Patients" component={PatientsScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initial, setInitial] = useState<keyof DoctorStackParamList | null>(null);
  useEffect(() => {
    (async () => {
      const c = await getSessionCookie();
      setInitial(c ? "Main" : "Login");
    })();
  }, []);
  if (!initial) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          ...DarkTheme,
          colors: { ...DarkTheme.colors, background: COLORS.bg, card: COLORS.bgRaised, text: COLORS.text, border: COLORS.border, primary: theme.primary },
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initial}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Consult" component={ConsultScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
