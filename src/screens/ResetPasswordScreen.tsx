import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // 1. Manejar deep link inicial (cuando abren la app desde el correo)
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('Deep link inicial recibido:', url);
        handleDeepLink(url);
      }
    });

    // 2. Escuchar deep links mientras la app está abierta
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link recibido:', url);
      handleDeepLink(url);
    });

    return () => subscription.remove();
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      // Parsear el URL (nutriu://reset-password?token=abc&type=recovery)
      const parsed = Linking.parse(url);
      console.log('URL parseado:', parsed);

      // Supabase envía el access_token en el query param "token" o directamente en el fragmento
      const token = parsed.queryParams?.token || parsed.queryParams?.access_token;

      if (!token) {
        console.warn('No se encontró token de recuperación en el deep link');
        setMessage('Enlace inválido o expirado. Solicita un nuevo restablecimiento.');
        return;
      }

      console.log('Token de recuperación encontrado:', token);

      // Intentar recuperar la sesión con el token
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        // Si no hay sesión, intentar refrescar con el token (Supabase lo maneja internamente)
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
          console.error('Error al recuperar sesión de recuperación:', refreshError);
          setMessage('El enlace ha expirado o es inválido. Solicita uno nuevo.');
          return;
        }

        console.log('Sesión recuperada exitosamente:', refreshData.session);
      }

      setSessionReady(true);
      setMessage('¡Sesión de recuperación activa! Ahora puedes cambiar tu contraseña.');
    } catch (err: any) {
      console.error('Error al manejar deep link:', err);
      setMessage('Error al procesar el enlace. Intenta de nuevo o solicita otro restablecimiento.');
    }
  };

  const handleReset = async () => {
    if (!sessionReady) {
      Alert.alert('Espera', 'Aún no se ha recuperado la sesión. Asegúrate de abrir el enlace enviado a tu correo.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error('Error al actualizar contraseña:', error);
        throw error;
      }

      console.log('Contraseña actualizada exitosamente:', data.user);

      setMessage('¡Contraseña cambiada exitosamente!');
      Alert.alert('Éxito', 'Tu contraseña ha sido actualizada. Ahora inicia sesión.', [
        {
          text: 'Ir a Login',
          onPress: () => {
            // Cerrar sesión parcial de recuperación y redirigir
            supabase.auth.signOut();
            navigation.navigate('Login');
          },
        },
      ]);
    } catch (err: any) {
      console.error('Error en handleReset:', err);
      setMessage('Error: ' + (err.message || 'Ocurrió un error inesperado'));
      Alert.alert('Error', err.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <Text style={styles.title}>Restablecer Contraseña</Text>
        <Text style={styles.subtitle}>
          {sessionReady
            ? 'Ingresa tu nueva contraseña'
            : 'Abre el enlace enviado a tu correo para continuar'}
        </Text>

        {sessionReady ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nueva contraseña"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoFocus
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Cambiar Contraseña</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.waitingText}>
              Esperando enlace de recuperación...
            </Text>
            <Text style={styles.waitingSubtext}>
              Revisa tu correo (incluyendo spam) y abre el enlace enviado.
            </Text>
          </View>
        )}

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', padding: 30 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#2E8B57' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#666' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2E8B57',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  message: { marginTop: 20, textAlign: 'center', fontSize: 16, color: '#2E8B57' },

  waitingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  waitingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginTop: 20,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});