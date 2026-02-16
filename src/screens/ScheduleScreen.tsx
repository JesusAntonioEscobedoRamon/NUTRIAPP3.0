import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  SafeAreaView, StatusBar, Modal, ActivityIndicator, Dimensions,
  Image, Alert 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useUser } from '../hooks/useUser';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#2E8B57',
  secondary: '#F0FFF4',
  accent: '#3CB371',
  textDark: '#1A3026',
  textLight: '#4A4A4A',
  white: '#FFFFFF',
  border: '#D1E8D5',
};

export default function ScheduleScreen({ navigation }: any) {
  const { user: authUser } = useAuth();
  const { user: patientData } = useUser();

  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'selection' | 'checkout' | 'success'>('selection');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('nutriologos')
          .select('id_nutriologo, nombre, apellido, especialidad, tarifa_consulta, foto_perfil')
          .eq('activo', true)
          .order('nombre');

        if (error) {
          console.error('Error al cargar nutriólogos:', error.message);
          Alert.alert('Error', 'No se pudieron cargar los nutriólogos. Intenta más tarde.');
          return;
        }

        const formatted = data?.map(d => {
          // No usamos getPublicUrl porque foto_perfil YA es la URL completa pública
          const photoUrl = d.foto_perfil && d.foto_perfil.trim() !== '' && d.foto_perfil !== 'nutriologo_default.png'
            ? d.foto_perfil
            : null;

          // Debug para que veas exactamente qué se está usando
          console.log(`Nutriólogo ${d.nombre} ${d.apellido}:`);
          console.log('  - foto_perfil en BD:', d.foto_perfil);
          console.log('  - URL usada en <Image>:', photoUrl);

          return {
            id: d.id_nutriologo.toString(),
            name: `Dr. ${d.nombre} ${d.apellido}`,
            specialty: d.especialidad || 'Nutrición Clínica',
            price: d.tarifa_consulta || 800,
            realId: d.id_nutriologo,
            photoUrl,
          };
        }) || [];

        setDoctors(formatted);
      } catch (err) {
        console.error('Excepción al cargar nutriólogos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const handlePayment = async () => {
    if (!selectedDoctor || !patientData?.id_paciente) {
      Alert.alert('Atención', 'No se pudo identificar al paciente o al nutriólogo.');
      return;
    }

    setIsProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from('citas')
        .insert({
          id_paciente: patientData.id_paciente,
          id_nutriologo: selectedDoctor.realId,
          fecha_hora: new Date().toISOString(),
          estado: 'pendiente',
          tipo_cita: 'presencial',
          motivo_consulta: 'Consulta inicial',
          duracion_minutos: 60,
        });

      if (error) throw error;

      setPaymentStep('success');
    } catch (err) {
      console.error('Error al crear cita:', err);
      Alert.alert('Error', 'No se pudo reservar la cita.');
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setPaymentStep('selection');
    setSelectedDoctor(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 16, color: COLORS.textDark }}>Cargando especialistas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (doctors.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textDark, textAlign: 'center' }}>
            No hay nutriólogos disponibles en este momento
          </Text>
          <TouchableOpacity 
            style={{ marginTop: 24, backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: COLORS.white, fontWeight: '700' }}>Regresar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back-outline" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>AGENDAR UNA CITA</Text>
          <View style={styles.underlineSmall} />
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introSection}>
          <Text style={styles.mainTitle}>Reserva tu Consulta</Text>
          <Text style={styles.subtitle}>Selecciona un especialista para proceder con tu registro y pago seguro.</Text>
        </View>

        {doctors.map((doctor) => (
          <TouchableOpacity
            key={doctor.id}
            style={styles.doctorCard}
            onPress={() => {
              setSelectedDoctor(doctor);
              setPaymentStep('checkout');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              {doctor.photoUrl ? (
                <Image
                  source={{ uri: doctor.photoUrl }}
                  style={{ width: '100%', height: '100%', borderRadius: 18 }}
                  resizeMode="cover"
                  onError={(e) => console.log(`Error cargando imagen de ${doctor.name}:`, e.nativeEvent.error)}
                  onLoad={() => console.log(`Imagen cargada correctamente para ${doctor.name}`)}
                />
              ) : (
                <MaterialCommunityIcons name="account-tie" size={30} color={COLORS.primary} />
              )}
            </View>

            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <View style={styles.specialtyRow}>
                <View style={styles.dot} />
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              </View>
            </View>

            <View style={styles.priceTag}>
              <Text style={styles.priceText}>${doctor.price}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Modal visible={paymentStep !== 'selection'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.paymentCard}>
              {paymentStep === 'checkout' ? (
                <>
                  <Text style={styles.modalTitle}>Resumen de la Cita</Text>
                  
                  <View style={styles.receiptContainer}>
                    <View style={styles.receiptLine}>
                      <Text style={styles.receiptLabel}>Especialista:</Text>
                      <Text style={styles.receiptValue}>{selectedDoctor?.name}</Text>
                    </View>
                    <View style={styles.receiptLine}>
                      <Text style={styles.receiptLabel}>Servicio:</Text>
                      <Text style={styles.receiptValue}>Consulta Nutricional</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.receiptLine}>
                      <Text style={styles.totalLabel}>Total a pagar:</Text>
                      <Text style={styles.totalValue}>${selectedDoctor?.price}.00 MXN</Text>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.payButton} 
                    onPress={handlePayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                      <View style={styles.buttonInner}>
                        <Ionicons name="card-outline" size={24} color={COLORS.white} />
                        <Text style={styles.payButtonText}>PAGAR AHORA CON STRIPE</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={closeModal} style={styles.cancelButton} disabled={isProcessing}>
                    <Text style={styles.cancelButtonText}>REGRESAR</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.successContainer}>
                  <View style={styles.successIconCircle}>
                    <Ionicons name="checkmark-sharp" size={60} color={COLORS.white} />
                  </View>
                  <Text style={styles.successTitle}>¡Pago Completado!</Text>
                  <Text style={styles.successMsg}>Tu transacción ha sido procesada con éxito.</Text>
                  <Text style={styles.successMsg}>Se ha enviado el recibo a tu correo.</Text>
                  
                  <TouchableOpacity 
                    style={styles.finalButton} 
                    onPress={() => {
                      closeModal();
                      navigation.navigate('Calendar', { doctorName: selectedDoctor.name });
                    }}
                  >
                    <Text style={styles.finalButtonText}>SELECCIONAR FECHA Y HORA</Text>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.white} style={{marginLeft: 10}} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <View style={styles.helpCard}>
          <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
          <Text style={styles.helpText}>
            Tus pagos están protegidos de extremo a extremo por tecnología de encriptación bancaria.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerIcon: { padding: 5 },
  brandContainer: { alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 1.5 },
  underlineSmall: { width: 20, height: 3, backgroundColor: COLORS.accent, borderRadius: 2, marginTop: 2 },
  placeholder: { width: 40 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  introSection: { marginBottom: 30, alignItems: 'center' },
  mainTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textDark, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginTop: 8, fontWeight: '600', lineHeight: 20 },
  
  doctorCard: { backgroundColor: COLORS.white, padding: 18, borderRadius: 22, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: COLORS.border, elevation: 2 },
  avatarContainer: { width: 55, height: 55, borderRadius: 18, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  doctorInfo: { flex: 1, marginLeft: 15 },
  doctorName: { fontSize: 17, fontWeight: '900', color: COLORS.textDark },
  specialtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent, marginRight: 6 },
  doctorSpecialty: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  priceTag: { backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  priceText: { fontWeight: '900', color: COLORS.primary, fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 48, 38, 0.85)', justifyContent: 'flex-end' },
  paymentCard: { backgroundColor: COLORS.white, borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, minHeight: 450, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textDark, marginBottom: 25 },
  
  receiptContainer: { width: '100%', backgroundColor: COLORS.secondary, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 25 },
  receiptLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  receiptLabel: { color: COLORS.textLight, fontWeight: '700', fontSize: 14 },
  receiptValue: { color: COLORS.textDark, fontWeight: '800', fontSize: 14 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10, borderStyle: 'dashed', borderWidth: 0.5 },
  totalLabel: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },
  totalValue: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  
  payButton: { backgroundColor: COLORS.primary, width: '100%', padding: 18, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
  buttonInner: { flexDirection: 'row', alignItems: 'center' },
  payButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 16, marginLeft: 12 },
  cancelButton: { padding: 20 },
  cancelButtonText: { color: COLORS.textLight, fontWeight: '800', fontSize: 14 },
  
  successContainer: { alignItems: 'center', width: '100%', paddingVertical: 20 },
  successIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 5 },
  successTitle: { fontSize: 26, fontWeight: '900', color: COLORS.primary, marginBottom: 10 },
  successMsg: { color: COLORS.textLight, fontWeight: '600', textAlign: 'center', fontSize: 15 },
  finalButton: { backgroundColor: COLORS.accent, width: '100%', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 35 },
  finalButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 16 },

  helpCard: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 20, borderRadius: 20, marginTop: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.primary },
  helpText: { flex: 1, marginLeft: 12, fontSize: 12, color: COLORS.textDark, fontWeight: '700' }
});