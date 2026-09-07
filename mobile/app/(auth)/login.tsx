import { useState, useEffect } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { TextInput, Button, Text, Surface, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import AuthService from '../../services/authService';
import { router } from 'expo-router';
import { getApiUrl, setApiUrl, DEFAULT_API_URL } from '../../services/tokenStore';
import { updateApiUrl } from '../../services/apiClient';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const { showNotification } = useNotification();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);

  // Server URL modal
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // Load current API URL
    getApiUrl().then((url) => {
      setCurrentUrl(url);
      setServerUrl(url);
    });
  }, []);

  // Check registration status on mount
  useEffect(() => {
    AuthService.registrationStatus()
      .then((open) => {
        setRegistrationOpen(open);
        if (open) setIsRegisterMode(true);
      })
      .catch(() => setRegistrationOpen(false));
  }, []);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isRegisterMode) {
        await register(username.trim(), password);
        showNotification('Account created successfully!', 'success');
      } else {
        await login(username.trim(), password);
      }
      router.replace('/(app)');
    } catch (e: any) {
      setError(e?.friendlyMessage || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServerUrl = async () => {
    const trimmed = serverUrl.trim().replace(/\/$/, '');
    if (!trimmed) return;
    await setApiUrl(trimmed);
    await updateApiUrl(trimmed);
    setCurrentUrl(trimmed);
    setServerModalVisible(false);
    showNotification('Server URL updated', 'success');
    // Retry registration check with new URL
    AuthService.registrationStatus()
      .then((open) => setRegistrationOpen(open))
      .catch(() => setRegistrationOpen(false));
  };

  const handleResetUrl = async () => {
    setServerUrl(DEFAULT_API_URL);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Gear icon top-right */}
        <TouchableOpacity
          style={styles.gearBtn}
          onPress={() => {
            setServerUrl(currentUrl);
            setServerModalVisible(true);
          }}
        >
          <MaterialCommunityIcons name="cog-outline" size={24} color="#475569" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>💰</Text>
          <Text variant="headlineLarge" style={styles.title}>Expense Tracker</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Self-hosted personal finance</Text>
        </View>

        {/* Card */}
        <Surface style={styles.card} elevation={3}>
          <Text variant="titleLarge" style={styles.cardTitle}>
            {isRegisterMode ? 'Create Account' : 'Sign In'}
          </Text>

          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
            theme={{ colors: { background: '#1e293b' } }}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            theme={{ colors: { background: '#1e293b' } }}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
          />

          {error ? <HelperText type="error" visible>{error}</HelperText> : null}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {isRegisterMode ? 'Create Account' : 'Sign In'}
          </Button>

          {registrationOpen === false && (
            <TouchableOpacity onPress={() => setIsRegisterMode(!isRegisterMode)} style={styles.toggle}>
              <Text style={styles.toggleText}>
                {isRegisterMode ? 'Already have an account? Sign In' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </Surface>

        {/* Current server indicator */}
        <TouchableOpacity
          style={styles.serverRow}
          onPress={() => {
            setServerUrl(currentUrl);
            setServerModalVisible(true);
          }}
        >
          <MaterialCommunityIcons name="server" size={12} color="#475569" />
          <Text style={styles.serverText} numberOfLines={1}>{currentUrl}</Text>
          <MaterialCommunityIcons name="pencil" size={11} color="#6366f1" />
        </TouchableOpacity>
      </ScrollView>

      {/* Server URL Modal */}
      <Modal
        visible={serverModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setServerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="server" size={20} color="#6366f1" />
              <Text style={styles.modalTitle}>Server URL</Text>
            </View>

            <Text style={styles.modalDesc}>
              Enter your backend server address. Include the port if not using port 80.
            </Text>

            <TextInput
              label="Server URL"
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              mode="outlined"
              style={styles.urlInput}
              placeholder="http://100.x.x.x:8080/api"
              theme={{ colors: { background: '#0f172a' } }}
            />

            <Text style={styles.exampleText}>
              Example: http://100.103.68.49:8080/api
            </Text>

            <View style={styles.modalButtons}>
              <Button
                onPress={handleResetUrl}
                textColor="#64748b"
                compact
              >
                Reset Default
              </Button>
              <View style={styles.modalRight}>
                <Button onPress={() => setServerModalVisible(false)} textColor="#64748b">
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveServerUrl}
                  style={{ backgroundColor: '#6366f1' }}
                >
                  Save
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  gearBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 56, marginBottom: 12 },
  title: { color: '#f8fafc', fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#94a3b8', marginTop: 4 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { color: '#f8fafc', fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  input: { marginBottom: 12, backgroundColor: '#1e293b' },
  button: { marginTop: 8, borderRadius: 10, backgroundColor: '#6366f1' },
  buttonContent: { height: 50 },
  buttonLabel: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  toggle: { marginTop: 16, alignItems: 'center' },
  toggleText: { color: '#6366f1', fontSize: 14 },

  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 5,
  },
  serverText: { color: '#475569', fontSize: 11, maxWidth: '80%' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  modalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  modalDesc: { color: '#64748b', fontSize: 13, marginBottom: 16, lineHeight: 20 },
  urlInput: { backgroundColor: '#0f172a', marginBottom: 8 },
  exampleText: { color: '#475569', fontSize: 11, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalRight: { flexDirection: 'row', gap: 8 },
});
