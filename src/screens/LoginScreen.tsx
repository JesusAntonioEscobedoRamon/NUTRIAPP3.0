import React, { useState } from 'react';
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

export default function LoginScreen({ navigation }: any) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [modalVisible, setModalVisible] = useState({ show: false, title: '', message: '' });
  const [selectedGender, setSelectedGender] = useState<string>('');

  // Estado del Formulario
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    username: '',
    email: '',
    celular: '',
    password: '',
    confirmPassword: '',
    peso: '',
    altura: '',
    objetivo: '',
    fecha_nacimiento: '',
    genero: ''
  });

  // Estado para DateTimePicker
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDateModal, setShowDateModal] = useState(false);

  const showAlert = (title: string, message: string) => {
    setModalVisible({ show: true, title, message });
  };

  const updateForm = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  // Formatear teléfono (###) ###-####
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    
    if (match) {
      const formatted = match[1] + (match[2] ? ` ${match[2]}` : '') + (match[3] ? `-${match[3]}` : '');
      return formatted;
    }
    return value;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    updateForm('celular', formatted);
  };

  // Manejar selección de fecha
  const handleDateSelect = () => {
    setShowDateModal(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDateModal(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
      // Formatear fecha como YYYY-MM-DD para la BD
      const formattedDate = selectedDate.toISOString().split('T')[0];
      updateForm('fecha_nacimiento', formattedDate);
    }
  };

  // Calcular edad desde fecha de nacimiento
  const calculateAge = (birthDateStr: string) => {
    if (!birthDateStr) return '';
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} años`;
  };

  // LOGIN
  const handleLogin = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      showAlert('Atención', 'Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    const result = await signIn(form.email, form.password);
    setLoading(false);

    if (!result.success) {
      showAlert('Error de autenticación', result.error || 'Error al iniciar sesión');
    }
  };

  // REGISTRO
  const handleRegister = async () => {
    const { nombre, apellido, username, email, celular, password, confirmPassword, peso, altura, objetivo, fecha_nacimiento, genero } = form;

    // Validaciones
    const requiredFields = ['nombre', 'apellido', 'username', 'email', 'celular', 'password', 'confirmPassword'];
    const missingFields = requiredFields.filter(field => !form[field as keyof typeof form]?.toString().trim());
    
    if (missingFields.length > 0) {
      showAlert('Atención', 'Todos los campos son obligatorios.');
      return;
    }

    // Validar que fecha_nacimiento y genero estén presentes
    if (!fecha_nacimiento.trim() || !genero.trim()) {
      showAlert('Atención', 'La fecha de nacimiento y género son obligatorios.');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Atención', 'Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      showAlert('Atención', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // Validar teléfono (10 dígitos)
    const cleanPhone = celular.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      showAlert('Atención', 'El número de teléfono debe tener 10 dígitos.');
      return;
    }

    // Validar altura - SIN PUNTO DECIMAL
    if (altura) {
      const alturaStr = altura.toString();
      if (alturaStr.includes('.')) {
        showAlert('Atención', 'La altura debe ser ingresada sin punto decimal. Ejemplo: 170 en lugar de 1.70');
        return;
      }
      
      const alturaNum = parseFloat(altura);
      if (alturaNum <= 0 || alturaNum > 250) {
        showAlert('Atención', 'Por favor ingresa una altura válida (0-250 cm).');
        return;
      }
    }

    // Validar peso
    if (peso) {
      const pesoNum = parseFloat(peso);
      if (pesoNum <= 0 || pesoNum > 300) {
        showAlert('Atención', 'Por favor ingresa un peso válido (0-300 kg).');
        return;
      }
    }

    // Preparar datos
    const userData: any = {
      nombre,
      apellido,
      username,
      email,
      celular: cleanPhone,
      password,
      fecha_nacimiento,
      genero,
    };

    // Campos opcionales
    if (peso) userData.peso = parseFloat(peso);
    if (altura) userData.altura = parseFloat(altura);
    if (objetivo) userData.objetivo = objetivo;

    setLoading(true);
    const result = await signUp(userData);
    setLoading(false);

    if (result.success) {
      showAlert('Registro exitoso', 
        result.message || '¡Cuenta creada exitosamente! Por favor verifica tu correo electrónico para activar tu cuenta. Revisa tu bandeja de entrada y spam.');
      
      // Limpiar formulario
      setForm({
        nombre: '', apellido: '', username: '', email: '', celular: '',
        password: '', confirmPassword: '', peso: '', altura: '', objetivo: '',
        fecha_nacimiento: '', genero: ''
      });
      setSelectedGender('');
      setBirthDate(new Date());
      setIsLogin(true);
    } else {
      showAlert('Error en registro', result.error || 'Error al registrarse');
    }
  };

  const handleRecovery = async () => {
    if (!form.email.trim()) {
      showAlert('Atención', 'Ingresa tu correo para enviarte el enlace de recuperación.');
      return;
    }
    
    setLoading(true);
    const result = await resetPassword(form.email);
    setLoading(false);
    
    if (result.success) {
      showAlert('Enlace enviado', 'Se ha enviado un enlace de recuperación a tu correo.');
    } else {
      showAlert('Error', result.error || 'Error al enviar el enlace');
    }
  };

  // Renderizar fecha formateada
  const renderDateText = () => {
    if (form.fecha_nacimiento) {
      const date = new Date(form.fecha_nacimiento);
      const age = calculateAge(form.fecha_nacimiento);
      return `${date.toLocaleDateString('es-MX')} (${age})`;
    }
    return 'Seleccionar fecha';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={styles.brandName}>NUTRI U</Text>
            <View style={styles.underline} />
            <Text style={styles.subtitle}>
              {isLogin ? 'App de Nutrición y Salud' : 'Registro de Paciente'}
            </Text>
          </View>

          <View style={styles.card}>
            {!isLogin && (
              <>
                <View style={styles.row}>
                  <CustomInput 
                    icon="person-outline" 
                    placeholder="Nombre*" 
                    value={form.nombre}
                    onChangeText={(t: string) => updateForm('nombre', t)}
                    style={{ flex: 1, marginRight: 10 }}
                  />
                  <CustomInput 
                    icon="person-outline" 
                    placeholder="Apellido*" 
                    value={form.apellido}
                    onChangeText={(t: string) => updateForm('apellido', t)}
                    style={{ flex: 1 }}
                  />
                </View>
                
                <CustomInput 
                  icon="at-outline" 
                  placeholder="Nombre de usuario*" 
                  value={form.username}
                  onChangeText={(t: string) => updateForm('username', t)}
                />
                
                <View style={styles.row}>
                  <CustomInput 
                    icon="mail-outline" 
                    placeholder="Correo electrónico*" 
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={form.email}
                    onChangeText={(t: string) => updateForm('email', t)}
                    style={{ flex: 1, marginRight: 10 }}
                  />
                  <CustomInput 
                    icon="call-outline" 
                    placeholder="Celular*" 
                    keyboardType="phone-pad"
                    value={form.celular}
                    onChangeText={handlePhoneChange}
                    maxLength={12} // (###) ###-####
                    style={{ flex: 1 }}
                  />
                </View>
                
                {/* FECHA DE NACIMIENTO */}
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={handleDateSelect}
                >
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
                  <Text style={[styles.dateText, !form.fecha_nacimiento && { color: '#999' }]}>
                    {renderDateText()}
                  </Text>
                </TouchableOpacity>
                
                {/* GÉNERO */}
                <View style={styles.genderContainer}>
                  <Text style={styles.genderLabel}>Género*</Text>
                  <View style={styles.genderButtons}>
                    <TouchableOpacity 
                      style={[styles.genderButton, selectedGender === 'masculino' && styles.genderButtonActive]}
                      onPress={() => {
                        setSelectedGender('masculino');
                        updateForm('genero', 'masculino');
                      }}
                    >
                      <Text style={[styles.genderButtonText, selectedGender === 'masculino' && styles.genderButtonTextActive]}>
                        Masculino
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.genderButton, selectedGender === 'femenino' && styles.genderButtonActive]}
                      onPress={() => {
                        setSelectedGender('femenino');
                        updateForm('genero', 'femenino');
                      }}
                    >
                      <Text style={[styles.genderButtonText, selectedGender === 'femenino' && styles.genderButtonTextActive]}>
                        Femenino
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.genderButton, selectedGender === 'otro' && styles.genderButtonActive]}
                      onPress={() => {
                        setSelectedGender('otro');
                        updateForm('genero', 'otro');
                      }}
                    >
                      <Text style={[styles.genderButtonText, selectedGender === 'otro' && styles.genderButtonTextActive]}>
                        Otro
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Campos opcionales */}
                <View style={styles.row}>
                  <CustomInput 
                    icon="scale-outline" 
                    placeholder="Peso (kg)" 
                    keyboardType="numeric"
                    value={form.peso}
                    onChangeText={(t: string) => updateForm('peso', t)}
                    style={{ flex: 1, marginRight: 10 }}
                  />
                  <CustomInput 
                    icon="resize-outline" 
                    placeholder="Altura (cm) - Sin punto" 
                    keyboardType="numeric"
                    value={form.altura}
                    onChangeText={(t: string) => updateForm('altura', t)}
                    style={{ flex: 1 }}
                  />
                </View>
                
                {/* Mensaje de advertencia para altura */}
                {form.altura && form.altura.includes('.') && (
                  <View style={styles.warningContainer}>
                    <Ionicons name="warning-outline" size={16} color={COLORS.error} />
                    <Text style={styles.warningText}>
                      Ingresa la altura sin punto decimal (ej: 170 en lugar de 1.70)
                    </Text>
                  </View>
                )}
                
                <CustomInput 
                  icon="flag-outline" 
                  placeholder="Objetivo (opcional)" 
                  value={form.objetivo}
                  onChangeText={(t: string) => updateForm('objetivo', t)}
                />
              </>
            )}

            {/* Campos comunes */}
            <CustomInput 
              icon="mail-outline" 
              placeholder="Correo electrónico*" 
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(t: string) => updateForm('email', t)}
            />
            
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="Contraseña*" 
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(t: string) => updateForm('password', t)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <CustomInput 
                icon="shield-checkmark-outline" 
                placeholder="Confirmar contraseña*" 
                secureTextEntry={true}
                value={form.confirmPassword}
                onChangeText={(t: string) => updateForm('confirmPassword', t)}
              />
            )}

            {isLogin && (
              <TouchableOpacity onPress={handleRecovery} style={styles.forgotBtn}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.mainBtn, loading && { opacity: 0.7 }]} 
              onPress={isLogin ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainBtnText}>{isLogin ? 'INICIAR SESIÓN' : 'REGISTRARME'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchBtn}>
              <Text style={styles.switchText}>
                {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <Text style={styles.switchTextBold}>{isLogin ? 'Regístrate' : 'Inicia sesión'}</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>App Nutri U © 2024</Text>
            <Text style={styles.footerNote}>* Campos obligatorios</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL DE ALERTA */}
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

      {/* DATE PICKER */}
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
    <TextInput 
      style={[styles.input]} 
      placeholder={placeholder}
      placeholderTextColor="#999" 
      {...props} 
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: 20, 
    justifyContent: 'center', 
    paddingTop: 40,
    paddingBottom: 20 
  },
  header: { alignItems: 'center', marginBottom: 30 },
  brandName: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: COLORS.primary, 
    letterSpacing: 2 
  },
  underline: { 
    width: 40, 
    height: 4, 
    backgroundColor: COLORS.accent, 
    marginTop: 5, 
    borderRadius: 2 
  },
  subtitle: { 
    color: COLORS.textLight, 
    marginTop: 10, 
    fontSize: 14, 
    fontWeight: '300', 
    textAlign: 'center' 
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5
  },
  row: { flexDirection: 'row', marginBottom: 15 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 15,
    paddingVertical: 8
  },
  inputIcon: { marginRight: 12 },
  input: { 
    flex: 1, 
    color: COLORS.textDark, 
    fontSize: 15,
    paddingVertical: 2 
  },
  
  // Fecha de nacimiento
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 15,
    paddingVertical: 12,
  },
  dateText: {
    flex: 1,
    color: COLORS.textDark,
    fontSize: 15,
  },
  
  // Género
  genderContainer: {
    marginBottom: 15,
  },
  genderLabel: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '600',
    marginBottom: 8,
  },
  genderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 3,
  },
  genderButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center',
  },
  genderButtonTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  
  // Advertencia altura
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },
  
  forgotBtn: { 
    alignSelf: 'flex-end', 
    marginBottom: 20 
  },
  forgotText: { 
    color: COLORS.primary, 
    fontSize: 13, 
    fontWeight: '600' 
  },
  mainBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  mainBtnText: { 
    color: COLORS.white, 
    fontWeight: 'bold', 
    fontSize: 14, 
    letterSpacing: 1 
  },
  switchBtn: { 
    marginTop: 20, 
    alignItems: 'center' 
  },
  switchText: { 
    color: COLORS.textLight, 
    fontSize: 13 
  },
  switchTextBold: { 
    color: COLORS.primary, 
    fontWeight: '700' 
  },
  footer: { 
    marginTop: 30, 
    marginBottom: 10, 
    alignItems: 'center' 
  },
  footerText: { 
    color: '#BBB', 
    fontSize: 10, 
    letterSpacing: 0.5 
  },
  footerNote: {
    color: '#999',
    fontSize: 9,
    marginTop: 5,
    fontStyle: 'italic',
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: COLORS.white, 
    borderRadius: 15, 
    padding: 25, 
    width: '90%', 
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: { 
    fontSize: 14, 
    color: COLORS.textLight, 
    textAlign: 'center', 
    marginBottom: 24,
    lineHeight: 20,
  },
  modalBtn: { 
    paddingHorizontal: 32, 
    paddingVertical: 12, 
    borderRadius: 8,
    minWidth: 140,
  },
  modalBtnText: { 
    color: COLORS.white, 
    fontWeight: 'bold', 
    fontSize: 13,
    textAlign: 'center',
  }
});