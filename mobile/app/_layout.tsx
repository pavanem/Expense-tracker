import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { NotificationProvider } from '../context/NotificationContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

// Prevent splash from hiding until we've bootstrapped the session
SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#6366f1',         // Indigo
    secondary: '#22d3ee',       // Cyan
    background: '#0f172a',      // Slate 900
    surface: '#1e293b',         // Slate 800
    surfaceVariant: '#334155',  // Slate 700
    onBackground: '#f8fafc',
    onSurface: '#f8fafc',
    error: '#ef4444',
  },
};

function RootLayoutNav() {
  const { isInitializing } = useAuth();

  useEffect(() => {
    if (!isInitializing) {
      SplashScreen.hideAsync();
    }
  }, [isInitializing]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <PaperProvider theme={theme}>
        <NotificationProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <RootLayoutNav />
          </AuthProvider>
        </NotificationProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
