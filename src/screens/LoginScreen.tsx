import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Modal, StatusBar, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#2E8B57',
  secondary: '#F0FFF4',
  accent: '#3CB371',
  textDark: '#1A3026',
  textLight: '#4A4A4A',
  white: '#FFFFFF',
  border: '#E0E0E0',
  error: '#D32F2F',
  success: '#2E7D32'
};

// --- COMPONENTE DE FONDO ESTÁTICO CON ICONOS ---
const StaticBackgroundIcons = () => {
  // Posiciones fijas para los iconos
  const iconPositions = [
    { top: '10%', left: '5%', name: 'leaf-outline', size: 45, opacity: 0.08 },
    { top: '20%', right: '8%', name: 'nutrition-outline', size: 55, opacity: 0.08 },
    { top: '45%', left: '15%', name: 'fitness-outline', size: 40, opacity: 0.08 },
    { top: '60%', right: '12%', name: 'heart-outline', size: 50, opacity: 0.08 },
    { top: '75%', left: '7%', name: 'water-outline', size: 35, opacity: 0.08 },
    { top: '85%', right: '5%', name: 'restaurant-outline', size: 48, opacity: 0.08 },
    { top: '30%', left: '25%', name: 'barbell-outline', size: 42, opacity: 0.08 },
    { top: '50%', right: '20%', name: 'medkit-outline', size: 38, opacity: 0.08 },
    { top: '15%', right: '25%', name: 'apple-outline', size: 52, opacity: 0.08 },
    { top: '70%', left: '20%', name: 'walk-outline', size: 44, opacity: 0.08 },
    { top: '40%', left: '8%', name: 'body-outline', size: 36, opacity: 0.08 },
    { top: '80%', right: '18%', name: 'moon-outline', size: 40, opacity: 0.08 },
  ];

  return (
    <View style={StyleSheet.absoluteFill}>
      {iconPositions.map((icon, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            top: icon.top,
            left: icon.left,
            right: icon.right,
            opacity: icon.opacity,
          }}
        >
          <Ionicons name={icon.name} size={icon.size} color="#222" />
        </View>
      ))}
    </View>
  );
};

export default function LoginScreen({ navigation }: any) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [modalVisible, setModalVisible] = useState({ show: false, title: '', message: '' });
  const [selectedGender, setSelectedGender] = useState<string>('');

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    username: '',
    email: '',
    celular: '',
    password: '',
    confirmPassword: '',
    fecha_nacimiento: '',
    genero: ''
  });

  const [birthDate, setBirthDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);

  const showAlert = (title: string, message: string) => {
    setModalVisible({ show: true, title, message });
  };

  const updateForm = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return match[1] + (match[2] ? ` ${match[2]}` : '') + (match[3] ? `-${match[3]}` : '');
    }
    return value;
  };

  const handlePhoneChange = (text: string) => {
    updateForm('celular', formatPhoneNumber(text));
  };

  const handleDateSelect = () => setShowDateModal(true);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDateModal(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
      updateForm('fecha_nacimiento', selectedDate.toISOString().split('T')[0]);
    }
  };

  const calculateAge = (birthDateStr: string) => {
    if (!birthDateStr) return '';
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return `${age} años`;
  };

  const handleLogin = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      showAlert('Atención', 'Por favor, ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    const result = await signIn(form.email.trim(), form.password.trim());
    setLoading(false);
    if (!result.success) {
      showAlert('Error de autenticación', result.error || 'Error al iniciar sesión');
    }
  };

  const handleRegister = async () => {
    const { nombre, apellido, username, email, celular, password, confirmPassword, fecha_nacimiento, genero } = form;
    if (!nombre.trim() || !apellido.trim() || !username.trim() || !email.trim() || !celular.trim() || !password.trim() || !confirmPassword.trim() || !fecha_nacimiento.trim() || !genero.trim()) {
      showAlert('Atención', 'Todos los campos son obligatorios.');
      return;
    }
    if (password !== confirmPassword) { showAlert('Atención', 'Las contraseñas no coinciden.'); return; }
    if (password.length < 6) { showAlert('Atención', 'La contraseña debe tener al menos 6 caracteres.'); return; }
    const cleanPhone = celular.replace(/\D/g, '');
    if (cleanPhone.length !== 10) { showAlert('Atención', 'El número de teléfono debe tener 10 dígitos.'); return; }

    setLoading(true);
    const result = await signUp({ ...form, celular: cleanPhone });
    setLoading(false);

    if (result.success) {
      showAlert('Registro exitoso', result.message || '¡Cuenta creada! Verifica tu correo.');
      setForm({ nombre: '', apellido: '', username: '', email: '', celular: '', password: '', confirmPassword: '', fecha_nacimiento: '', genero: '' });
      setSelectedGender('');
      setBirthDate(new Date());
      setIsLogin(true);
    } else {
      showAlert('Error en registro', result.error || 'Error al registrarse');
    }
  };

  const handleRecovery = async () => {
    if (!form.email.trim()) {
      showAlert('Atención', 'Por favor ingresa tu correo electrónico.');
      return;
    }

    setRecoveryLoading(true);
    const result = await resetPassword(form.email.trim());
    setRecoveryLoading(false);

    if (result.success) {
      showAlert(
        'Enlace enviado',
        'Se ha enviado un enlace de recuperación a tu correo. Revisa tu bandeja (incluyendo spam) y sigue las instrucciones.'
      );
    } else {
      showAlert(
        'Error',
        result.error || 'No pudimos enviar el enlace. Verifica el correo e intenta nuevamente.'
      );
    }
  };

  const renderDateText = () => {
    if (form.fecha_nacimiento) {
      const date = new Date(form.fecha_nacimiento);
      return `${date.toLocaleDateString('es-MX')} (${calculateAge(form.fecha_nacimiento)})`;
    }
    return 'Seleccionar fecha';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <StaticBackgroundIcons />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.brandName}>NUTRI U</Text>
            <View style={styles.underline} />
            <Text style={styles.subtitle}>{isLogin ? 'App de Nutrición y Salud' : 'Registro de Paciente'}</Text>
          </View>

          <View style={styles.card}>
            {!isLogin && (
              <>
                <View style={styles.row}>
                  <CustomInput icon="person-outline" placeholder="Nombre*" value={form.nombre} onChangeText={(t: string) => updateForm('nombre', t)} style={{ flex: 1, marginRight: 10 }} />
                  <CustomInput icon="person-outline" placeholder="Apellido*" value={form.apellido} onChangeText={(t: string) => updateForm('apellido', t)} style={{ flex: 1 }} />
                </View>
                <CustomInput icon="at-outline" placeholder="Nombre de usuario*" value={form.username} onChangeText={(t: string) => updateForm('username', t)} />
                <View style={styles.row}>
                  <CustomInput icon="mail-outline" placeholder="Correo electrónico*" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(t: string) => updateForm('email', t)} style={{ flex: 1, marginRight: 10 }} />
                  <CustomInput icon="call-outline" placeholder="Celular*" keyboardType="phone-pad" value={form.celular} onChangeText={handlePhoneChange} maxLength={12} style={{ flex: 1 }} />
                </View>
                <TouchableOpacity style={styles.datePickerButton} onPress={handleDateSelect}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <Text style={[styles.dateText, !form.fecha_nacimiento && { color: '#999' }]}>{renderDateText()}</Text>
                </TouchableOpacity>
                <View style={styles.genderContainer}>
                  <Text style={styles.genderLabel}>Género*</Text>
                  <View style={styles.genderButtons}>
                    <TouchableOpacity style={[styles.genderButton, selectedGender === 'masculino' && styles.genderButtonActive]} onPress={() => { setSelectedGender('masculino'); updateForm('genero', 'masculino'); }}>
                      <Text style={[styles.genderButtonText, selectedGender === 'masculino' && styles.genderButtonTextActive]}>Hombre</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.genderButton, selectedGender === 'femenino' && styles.genderButtonActive]} onPress={() => { setSelectedGender('femenino'); updateForm('genero', 'femenino'); }}>
                      <Text style={[styles.genderButtonText, selectedGender === 'femenino' && styles.genderButtonTextActive]}>Mujer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {isLogin && (
              <CustomInput icon="mail-outline" placeholder="Correo electrónico*" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(t: string) => updateForm('email', t)} />
            )}

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Contraseña*" placeholderTextColor="#999" secureTextEntry={!showPassword} value={form.password} onChangeText={(t: string) => updateForm('password', t)} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Confirmar contraseña*" 
                  placeholderTextColor="#999" 
                  secureTextEntry={!showPassword} 
                  value={form.confirmPassword} 
                  onChangeText={(t: string) => updateForm('confirmPassword', t)} 
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            )}

            {isLogin && (
              <TouchableOpacity 
                onPress={handleRecovery} 
                style={styles.forgotBtn}
                disabled={recoveryLoading}
              >
                {recoveryLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.mainBtn, (loading || recoveryLoading) && { opacity: 0.7 }]} 
              onPress={isLogin ? handleLogin : handleRegister} 
              disabled={loading || recoveryLoading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.mainBtnText}>
                  {isLogin ? 'INICIAR SESIÓN' : 'REGISTRARME'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchBtn}>
              <Text style={styles.switchText}>
                {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <Text style={styles.switchTextBold}>
                  {isLogin ? 'Regístrate' : 'Inicia sesión'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>App Nutri U © 2026</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={modalVisible.show} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[
              styles.modalTitle, 
              modalVisible.title.includes('Error') ? { color: COLORS.error } : { color: COLORS.textDark }
            ]}>
              {modalVisible.title}
            </Text>
            <Text style={styles.modalMessage}>{modalVisible.message}</Text>
            <TouchableOpacity 
              style={[
                styles.modalBtn, 
                modalVisible.title.includes('Error') ? { backgroundColor: COLORS.error } : { backgroundColor: COLORS.primary }
              ]} 
              onPress={() => setModalVisible({...modalVisible, show: false})}
            >
              <Text style={styles.modalBtnText}>ENTENDIDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showDateModal && (
        <DateTimePicker 
          value={birthDate} 
          mode="date" 
          display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
          onChange={handleDateChange} 
          maximumDate={new Date()} 
          locale="es-MX" 
        />
      )}
    </View>
  );
}

const CustomInput = ({ icon, style, placeholder, ...props }: any) => (
  <View style={[styles.inputWrapper, style]}>
    <Ionicons name={icon} size={20} color={COLORS.primary} style={styles.inputIcon} />
    <TextInput style={[styles.input]} placeholder={placeholder} placeholderTextColor="#999" {...props} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'center', paddingTop: 40, paddingBottom: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  brandName: { fontSize: 32, fontWeight: '900', color: COLORS.primary, letterSpacing: 2 },
  underline: { width: 40, height: 4, backgroundColor: COLORS.accent, marginTop: 5, borderRadius: 2 },
  subtitle: { color: COLORS.textLight, marginTop: 10, fontSize: 14, fontWeight: '300', textAlign: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15 },
  row: { flexDirection: 'row', marginBottom: 15 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 15, paddingVertical: 8 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: COLORS.textDark, fontSize: 15, paddingVertical: 2 },
  datePickerButton: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 15, paddingVertical: 12 },
  dateText: { flex: 1, color: COLORS.textDark, fontSize: 15 },
  genderContainer: { marginBottom: 15 },
  genderLabel: { fontSize: 14, color: COLORS.textDark, fontWeight: '600', marginBottom: 8 },
  genderButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  genderButton: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.secondary, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 5 },
  genderButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  genderButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textLight },
  genderButtonTextActive: { color: COLORS.white, fontWeight: '700' },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  mainBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 4 },
  mainBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  switchBtn: { marginTop: 20, alignItems: 'center' },
  switchText: { color: COLORS.textLight, fontSize: 13 },
  switchTextBold: { color: COLORS.primary, fontWeight: '700' },
  footer: { marginTop: 30, marginBottom: 10, alignItems: 'center' },
  footerText: { color: '#BBB', fontSize: 10, letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 15, padding: 25, width: '90%', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8, minWidth: 140 },
  modalBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 13, textAlign: 'center' }
});