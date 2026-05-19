import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "react-native";

import WelcomeScreen from "./src/screens/Welcome";
import LoginScreen from "./src/screens/Login";
import DashboardScreen from "./src/screens/Dashboard";
import FindDoctorsScreen from "./src/screens/FindDoctors";
import DoctorDetailScreen from "./src/screens/DoctorDetail";
import RecordsScreen from "./src/screens/Records";
import FamilyScreen from "./src/screens/Family";
import ProfileScreen from "./src/screens/Profile";
import { getSessionCookie } from "@shared/api";
import { COLORS, ROLE_THEMES } from "@shared/theme";

const theme = ROLE_THEMES.patient;

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Main: undefined;
  DoctorDetail: { doctorId: string };
};
const Stack = createNativeStackNavigator<RootStackParamList>();

export type TabParamList = {
  Dashboard: undefined;
  Doctors: undefined;
  Records: undefined;
  Family: undefined;
  Profile: undefined;
};
const Tab = createBottomTabNavigator<TabParamList>();

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
            route.name === "Doctors"   ? "🩺" :
            route.name === "Records"   ? "📋" :
            route.name === "Family"    ? "👨‍👩‍👧‍👦" :
            "⚙️";
          return <Text style={{ fontSize: size - 4, color }}>{emoji}</Text>;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Doctors" component={FindDoctorsScreen} />
      <Tab.Screen name="Records" component={RecordsScreen} />
      <Tab.Screen name="Family" component={FamilyScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    // Skip the welcome screen if the user is already authenticated.
    (async () => {
      const c = await getSessionCookie();
      setInitialRoute(c ? "Main" : "Welcome");
    })();
  }, []);

  if (!initialRoute) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer
        theme={{
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: COLORS.bg,
            card: COLORS.bgRaised,
            text: COLORS.text,
            border: COLORS.border,
            primary: theme.primary,
          },
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="DoctorDetail" component={DoctorDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
