import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  StatusBar, 
  Modal, 
  ActivityIndicator, 
  Dimensions,
  Image, 
  Alert, 
  Animated, 
  Easing,
  TextInput,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNutriologo } from '../context/NutriologoContext';
import { supabase } from '../lib/supabase';
import { useUser } from '../hooks/useUser';
import { CardField, useStripe } from '@stripe/stripe-react-native';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#2E8B57',
  secondary: '#F0FFF4',
  accent: '#3CB371',
  textDark: '#1A3026',
  textLight: '#4A4A4A',
  white: '#FFFFFF',
  border: '#D1E8D5',
  card: '#FFFFFF',
  warning: '#FFA500',
  danger: '#FF4444',
  success: '#4CAF50',
  pending: '#FFC107',
  pendingLight: '#FFF3CD',
  info: '#17A2B8',
  infoLight: '#E3F2FD',
};

const PAYMENT_COLORS = {
  background: '#F8F9FA',
  cardBg: '#FFFFFF',
  border: '#DEE2E6',
  label: '#212529',
  placeholder: '#6C757D',
  button: '#0D6EFD',
  buttonText: '#FFFFFF',
  error: '#DC3545',
};

const CLINIC_OPEN_HOUR = 7;
const CLINIC_CLOSE_HOUR = 16;

export default function ScheduleScreen({ navigation, route }: any) {
  const { user: authUser } = useAuth();
  const { user: patientData, refreshUser } = useUser();
  const { refreshNutriologo, nutriologo } = useNutriologo();

  const [viewMode, setViewMode] = useState('agendar');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'selection' | 'checkout' | 'success'>('selection');

  const [cardDetails, setCardDetails] = useState(null);
  const [cardName, setCardName] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [citaId, setCitaId] = useState<number | null>(null);

  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [confirmedAppointments, setConfirmedAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);

  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const [nutriologoInfoModal, setNutriologoInfoModal] = useState(false);
  const [nutriologoInfoMsg, setNutriologoInfoMsg] = useState('');

  const { confirmPayment } = useStripe();

  // Detectar si viene desde Calendar con citaId
  useEffect(() => {
    if (route.params?.citaId) {
      setCitaId(route.params.citaId);
      const doctorId = Number(route.params.doctorId);
      setSelectedDoctor({ 
        name: route.params.doctorName || 'Nutriólogo',
        realId: isNaN(doctorId) ? 0 : doctorId,
        price: route.params.precio || 800
      });
      setPaymentStep('checkout');
    }
  }, [route.params]);

  // Animaciones de loading
  const pulseValue = useRef(new Animated.Value(1)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(0.5)).current;
  const textOpacityValue = useRef(new Animated.Value(0.3)).current;
  const bounceValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading || appointmentsLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, { toValue: 1.2, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseValue, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(rotateValue, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(rotateValue, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceValue, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(bounceValue, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, { toValue: 1.1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scaleValue, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(opacityValue, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacityValue, { toValue: 0.5, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(textOpacityValue, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(textOpacityValue, { toValue: 0.3, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [loading, appointmentsLoading]);

  // Función para refrescar datos (pull-to-refresh)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    if (viewMode === 'agendar') {
      await fetchDoctors();
    } else {
      await fetchAppointments();
    }
    
    setRefreshing(false);
  }, [viewMode]);

  // Función para cargar doctores
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
        const photoUrl = d.foto_perfil && d.foto_perfil.trim() !== '' && d.foto_perfil !== 'nutriologo_default.png'
          ? d.foto_perfil
          : null;

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

  // Función para cargar citas
  const fetchAppointments = async () => {
    if (!patientData?.id_paciente) return;

    try {
      setAppointmentsLoading(true);
      const { data, error } = await supabase
        .from('citas')
        .select(`
          id_cita,
          fecha_hora,
          estado,
          nutriologos!inner (
            id_nutriologo,
            nombre,
            apellido,
            especialidad,
            tarifa_consulta,
            foto_perfil
          )
        `)
        .eq('id_paciente', patientData.id_paciente)
        .in('estado', ['pendiente', 'confirmada', 'completada'])
        .order('fecha_hora', { ascending: false });

      if (error) {
        console.error('Error al cargar citas:', error.message);
        Alert.alert('Error', 'No se pudieron cargar tus citas. Intenta más tarde.');
        return;
      }

      const formatted = data?.map(cita => {
        const nutri = cita.nutriologos;
        const fechaHora = new Date(cita.fecha_hora);

        const fecha = fechaHora.toLocaleDateString('es-MX', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });

        const hora = fechaHora.toLocaleTimeString('es-MX', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });

        const photoUrl = nutri.foto_perfil && nutri.foto_perfil.trim() !== '' && nutri.foto_perfil !== 'nutriologo_default.png'
          ? nutri.foto_perfil
          : null;

        return {
          id: cita.id_cita,
          doctorName: `Dr. ${nutri.nombre} ${nutri.apellido}`,
          doctorPhoto: photoUrl,
          fecha,
          hora,
          monto: nutri.tarifa_consulta || 800,
          especialidad: nutri.especialidad || 'Nutrición Clínica',
          estado: cita.estado,
          id_nutriologo: nutri.id_nutriologo,
        };
      }) || [];

      setPendingAppointments(formatted.filter(a => a.estado === 'pendiente'));
      setConfirmedAppointments(formatted.filter(a => a.estado !== 'pendiente'));
    } catch (err) {
      console.error('Excepción al cargar citas:', err);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // Cargar nutriólogos
  useEffect(() => {
    fetchDoctors();
  }, []);

  // Cargar citas del paciente
  useEffect(() => {
    fetchAppointments();
  }, [patientData?.id_paciente]);

  const handleSelectDoctor = async (doctor: any) => {
    // Verificar si ya es su nutriólogo de cabecera
    if (nutriologo && nutriologo.id_nutriologo === doctor.realId) {
      // Mostrar modal informativo
      setSelectedDoctor(doctor);
      setNutriologoInfoModal(true);
      return; // ✅ NO NAVEGA A CALENDAR, NO COBRA
    }
    
    // Si no es su nutriólogo, proceder normalmente
    navigation.navigate('Calendar', {
      doctorName: doctor.name,
      doctorId: doctor.realId,
      precio: doctor.price,
    });
  };

  const handlePayment = async () => {
    if (!citaId || !patientData?.id_paciente || !selectedDoctor) {
      Alert.alert('Error', 'No se pudo procesar el pago. Intenta nuevamente.');
      return;
    }

    if (!cardDetails?.complete || !cardName) {
      Alert.alert('Atención', 'Por favor completa todos los campos de pago.');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const response = await fetch('https://carolin-nonprovisional-correctly.ngrok-free.dev/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: citaId,
          userId: patientData.id_paciente,
          appointmentTitle: `Consulta con ${selectedDoctor.name}`,
          monto: selectedDoctor.price
        }),
      });

      const text = await response.text();
      console.log('Respuesta del backend (create-payment-intent):', text);

      if (!response.ok) {
        throw new Error(`Error del backend: ${response.status} - ${text}`);
      }

      const { clientSecret } = JSON.parse(text);

      const { paymentIntent, error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: cardName,
            email: authUser?.email || 'no-email@nutriu.app',
          },
        },
      });

      if (error) throw new Error(error.message || 'Error al confirmar pago');

      if (!paymentIntent || paymentIntent.status.toLowerCase() !== 'succeeded') {
        throw new Error('El pago no fue completado exitosamente');
      }

      // Guardar pago
      const { error: insertError } = await supabase
        .from('pagos')
        .insert({
          id_cita: citaId,
          id_paciente: patientData.id_paciente,
          id_nutriologo: selectedDoctor.realId,
          monto: selectedDoctor.price,
          metodo_pago: 'stripe',
          estado: 'completado',
          stripe_payment_id: paymentIntent.id,
          fecha_pago: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Actualizar cita
      await supabase
        .from('citas')
        .update({ estado: 'pagada' })
        .eq('id_cita', citaId);

      // 🔥 VERIFICAR RELACIÓN CON NUTRIÓLOGO
      try {
        console.log('📝 Verificando relación con nutriólogo...');
        
        // Verificar si ya tiene una relación activa con este nutriólogo
        const { data: relacionExistente } = await supabase
          .from('paciente_nutriologo')
          .select('id_relacion, activo')
          .eq('id_paciente', patientData.id_paciente)
          .eq('id_nutriologo', selectedDoctor.realId)
          .maybeSingle();

        if (relacionExistente) {
          // Ya tiene relación con este nutriólogo
          console.log('⚠️ Ya tiene relación con este nutriólogo - solo actualizando a activo');
          
          // Actualizar a activo si estaba inactivo
          if (!relacionExistente.activo) {
            await supabase
              .from('paciente_nutriologo')
              .update({ activo: true, fecha_asignacion: new Date().toISOString() })
              .eq('id_relacion', relacionExistente.id_relacion);
          }
        } else {
          // No tiene relación, crear nueva
          console.log('✅ Creando nueva relación con nutriólogo');
          
          const nutriologoId = Number(selectedDoctor.realId);
          
          // Desactivar relaciones anteriores con otros nutriólogos
          await supabase
            .from('paciente_nutriologo')
            .update({ activo: false })
            .eq('id_paciente', patientData.id_paciente);

          // Crear nueva relación ACTIVA
          const { error: asignacionError } = await supabase
            .from('paciente_nutriologo')
            .insert({
              id_paciente: patientData.id_paciente,
              id_nutriologo: nutriologoId,
              fecha_asignacion: new Date().toISOString(),
              activo: true
            });

          if (asignacionError) {
            console.error('Error al asignar nutriólogo:', asignacionError);
          }
        }
        
        // Refrescar datos
        await refreshUser();
        await new Promise(resolve => setTimeout(resolve, 1500));
        await refreshNutriologo();
        
      } catch (error) {
        console.error('Error en asignación de nutriólogo:', error);
      }

      setViewMode('pendientes');
      setPaymentStep('success');

    } catch (err: any) {
      console.error('Error completo en handlePayment:', err);
      setPaymentError(err.message || 'Error desconocido al procesar el pago.');
      Alert.alert('Error en el pago', err.message || 'No se pudo completar el pago.');
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setPaymentStep('selection');
    setSelectedDoctor(null);
    setPaymentError(null);
    setCardName('');
    setCitaId(null);
  };

  const showAppointmentDetails = (appointment: any) => {
    setSelectedAppointment(appointment);
    setDetailsModalVisible(true);
  };

  if (loading || appointmentsLoading) {
    const rotate = rotateValue.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '10deg'] });
    const bounce = bounceValue.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContent}>
          <View style={styles.iconsRow}>
            <Animated.View style={[styles.iconContainer, { transform: [{ rotate }, { translateY: bounce }, { scale: pulseValue }], opacity: opacityValue }]}>
              <FontAwesome5 name="user-md" size={60} color={COLORS.primary} />
            </Animated.View>
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleValue }], opacity: opacityValue, marginLeft: 20 }]}>
              <MaterialCommunityIcons name="stethoscope" size={60} color={COLORS.accent} />
            </Animated.View>
          </View>
          <Animated.Text style={[styles.loadingText, { opacity: textOpacityValue }]}>
            Cargando información...
          </Animated.Text>
          <View style={styles.dotsContainer}>
            {[0, 1, 2].map(i => (
              <Animated.View 
                key={i} 
                style={[
                  styles.dot, 
                  { 
                    opacity: textOpacityValue.interpolate({ inputRange: [0.3, 1], outputRange: [0.3, 1] }),
                    transform: [{ scale: textOpacityValue.interpolate({ inputRange: [0.3, 1], outputRange: [0.8, 1.2] }) }]
                  }
                ]} 
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (doctors.length === 0 && viewMode === 'agendar') {
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
          <Text style={styles.brandName}>GESTIÓN DE CITAS</Text>
          <View style={styles.underlineSmall} />
        </View>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.navBar}>
        {['agendar', 'pendientes', 'confirmadas'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setViewMode(tab)}
            style={[
              styles.navItem,
              viewMode === tab && styles.navItemActive
            ]}
          >
            <Text style={[
              styles.navText,
              viewMode === tab && styles.navTextActive
            ]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
            title="Cargando..."
            titleColor={COLORS.primary}
          />
        }
      >
        {viewMode === 'agendar' && (
          <>
            <View style={styles.introSection}>
              <Text style={styles.mainTitle}>Reserva tu Consulta</Text>
              <Text style={styles.subtitle}>Selecciona un especialista para proceder con tu registro y pago seguro.</Text>
            </View>

            {doctors.map((doctor) => (
              <TouchableOpacity
                key={doctor.id}
                style={styles.doctorCard}
                onPress={() => handleSelectDoctor(doctor)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarContainer}>
                  {doctor.photoUrl ? (
                    <Image 
                      source={{ uri: doctor.photoUrl }} 
                      style={{ width: '100%', height: '100%', borderRadius: 18 }} 
                      resizeMode="cover" 
                    />
                  ) : (
                    <MaterialCommunityIcons name="account-tie" size={30} color={COLORS.primary} />
                  )}
                </View>

                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <View style={styles.specialtyRow}>
                    <View style={styles.specialtyDot} />
                    <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                  </View>
                </View>

                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>${doctor.price.toLocaleString('es-MX')}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.helpCard}>
              <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
              <Text style={styles.helpText}>
                Tus pagos están protegidos de extremo a extremo por tecnología de encriptación bancaria.
              </Text>
            </View>
          </>
        )}

        {viewMode === 'pendientes' && (
          <View style={styles.appointmentsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Próximas Citas (Pendientes de atención)</Text>
              <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.pending} />
            </View>

            {pendingAppointments.length > 0 ? (
              <View style={styles.appointmentsList}>
                {pendingAppointments.map((appointment) => (
                  <View key={appointment.id} style={styles.appointmentCard}>
                    <View style={styles.appointmentHeader}>
                      <View style={styles.appointmentAvatar}>
                        {appointment.doctorPhoto ? (
                          <Image 
                            source={{ uri: appointment.doctorPhoto }} 
                            style={{ width: '100%', height: '100%', borderRadius: 12 }} 
                            resizeMode="cover" 
                          />
                        ) : (
                          <MaterialCommunityIcons name="doctor" size={20} color={COLORS.primary} />
                        )}
                      </View>
                      <Text style={styles.appointmentDoctor}>{appointment.doctorName}</Text>

                      <View style={[styles.statusBadge, styles.pendingBadge]}>
                        <Ionicons name="time-outline" size={14} color={COLORS.pending} />
                        <Text style={styles.statusBadgeText}>Pendiente</Text>
                      </View>
                    </View>

                    <View style={styles.appointmentFooter}>
                      <TouchableOpacity 
                        style={styles.viewDetailsButton}
                        onPress={() => showAppointmentDetails(appointment)}
                      >
                        <Text style={styles.viewDetailsText}>Ver detalles</Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyAppointments}>
                <MaterialCommunityIcons name="clock-outline" size={50} color={COLORS.pending} />
                <Text style={styles.emptyAppointmentsText}>
                  No tienes citas pendientes
                </Text>
                <Text style={styles.emptyAppointmentsSubtext}>
                  Agenda tu próxima consulta en la pestaña "AGENDAR"
                </Text>
              </View>
            )}
          </View>
        )}

        {viewMode === 'confirmadas' && (
          <View style={styles.appointmentsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Citas Confirmadas / Atendidas</Text>
              <MaterialCommunityIcons name="calendar-check" size={24} color={COLORS.success} />
            </View>

            {confirmedAppointments.length > 0 ? (
              <View style={styles.appointmentsList}>
                {confirmedAppointments.map((appointment) => (
                  <View key={appointment.id} style={styles.appointmentCard}>
                    <View style={styles.appointmentHeader}>
                      <View style={styles.appointmentAvatar}>
                        {appointment.doctorPhoto ? (
                          <Image 
                            source={{ uri: appointment.doctorPhoto }} 
                            style={{ width: '100%', height: '100%', borderRadius: 12 }} 
                            resizeMode="cover" 
                          />
                        ) : (
                          <MaterialCommunityIcons name="doctor" size={20} color={COLORS.primary} />
                        )}
                      </View>
                      <Text style={styles.appointmentDoctor}>{appointment.doctorName}</Text>

                      <View style={[styles.statusBadge, styles.confirmedBadge]}>
                        <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                        <Text style={styles.statusBadgeText}>
                          {appointment.estado === 'confirmada' ? 'Confirmada' : 'Atendida'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.appointmentFooter}>
                      <TouchableOpacity 
                        style={styles.viewDetailsButton}
                        onPress={() => showAppointmentDetails(appointment)}
                      >
                        <Text style={styles.viewDetailsText}>Ver detalles</Text>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyAppointments}>
                <MaterialCommunityIcons name="calendar-check" size={50} color={COLORS.border} />
                <Text style={styles.emptyAppointmentsText}>
                  No tienes citas confirmadas o atendidas
                </Text>
                <Text style={styles.emptyAppointmentsSubtext}>
                  Una vez que el nutriólogo confirme la atención aparecerán aquí
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL DE DETALLES */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={detailsModalStyles.overlay}>
          <View style={detailsModalStyles.container}>
            <View style={detailsModalStyles.header}>
              <View style={detailsModalStyles.headerIcon}>
                <MaterialCommunityIcons name="calendar-check" size={30} color={COLORS.white} />
              </View>
              <Text style={detailsModalStyles.headerTitle}>Detalles de la Cita</Text>
              <TouchableOpacity 
                onPress={() => setDetailsModalVisible(false)}
                style={detailsModalStyles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <View style={detailsModalStyles.content}>
                <View style={detailsModalStyles.doctorSection}>
                  <View style={detailsModalStyles.doctorAvatar}>
                    {selectedAppointment.doctorPhoto ? (
                      <Image 
                        source={{ uri: selectedAppointment.doctorPhoto }} 
                        style={{ width: '100%', height: '100%', borderRadius: 35 }} 
                        resizeMode="cover" 
                      />
                    ) : (
                      <MaterialCommunityIcons name="doctor" size={40} color={COLORS.primary} />
                    )}
                  </View>
                  <View style={detailsModalStyles.doctorInfo}>
                    <Text style={detailsModalStyles.doctorName}>{selectedAppointment.doctorName}</Text>
                    <Text style={detailsModalStyles.doctorSpecialty}>{selectedAppointment.especialidad}</Text>
                  </View>
                </View>

                <View style={detailsModalStyles.divider} />

                <View style={detailsModalStyles.detailsCard}>
                  <View style={detailsModalStyles.detailItem}>
                    <View style={detailsModalStyles.detailIconContainer}>
                      <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
                    </View>
                    <View style={detailsModalStyles.detailTextContainer}>
                      <Text style={detailsModalStyles.detailLabel}>Fecha</Text>
                      <Text style={detailsModalStyles.detailValue}>{selectedAppointment.fecha}</Text>
                    </View>
                  </View>

                  <View style={detailsModalStyles.detailItem}>
                    <View style={detailsModalStyles.detailIconContainer}>
                      <Ionicons name="time-outline" size={22} color={COLORS.primary} />
                    </View>
                    <View style={detailsModalStyles.detailTextContainer}>
                      <Text style={detailsModalStyles.detailLabel}>Hora</Text>
                      <Text style={detailsModalStyles.detailValue}>{selectedAppointment.hora}</Text>
                    </View>
                  </View>

                  <View style={detailsModalStyles.detailItem}>
                    <View style={detailsModalStyles.detailIconContainer}>
                      <Ionicons name="cash-outline" size={22} color={COLORS.primary} />
                    </View>
                    <View style={detailsModalStyles.detailTextContainer}>
                      <Text style={detailsModalStyles.detailLabel}>Monto</Text>
                      <Text style={detailsModalStyles.detailValue}>${selectedAppointment.monto.toLocaleString('es-MX')} MXN</Text>
                    </View>
                  </View>
                </View>

                <View style={detailsModalStyles.statusSection}>
                  <View style={[
                    styles.statusBadge,
                    selectedAppointment.estado === 'pendiente' ? styles.pendingBadge : styles.confirmedBadge
                  ]}>
                    <Ionicons 
                      name={selectedAppointment.estado === 'pendiente' ? "time-outline" : "checkmark-circle"} 
                      size={16} 
                      color={selectedAppointment.estado === 'pendiente' ? COLORS.pending : COLORS.success} 
                    />
                    <Text style={styles.statusBadgeText}>
                      {selectedAppointment.estado === 'pendiente' ? 'Pendiente de atención' :
                       selectedAppointment.estado === 'confirmada' ? 'Confirmada' : 'Atendida'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={detailsModalStyles.closeButton2}
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <Text style={detailsModalStyles.closeButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL DE PAGO */}
      <Modal visible={paymentStep !== 'selection'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.paymentCard}>
            {paymentStep === 'checkout' && citaId ? (
              <>
                <Text style={styles.modalTitle}>Resumen de la Cita</Text>
                
                <View style={styles.receiptContainer}>
                  <View style={styles.receiptLine}>
                    <Text style={styles.receiptLabel}>Especialista:</Text>
                    <Text style={styles.receiptValue}>{selectedDoctor?.name || 'Nutriólogo'}</Text>
                  </View>
                  <View style={styles.receiptLine}>
                    <Text style={styles.receiptLabel}>Servicio:</Text>
                    <Text style={styles.receiptValue}>Consulta Nutricional</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.receiptLine}>
                    <Text style={styles.totalLabel}>Total a pagar:</Text>
                    <Text style={styles.totalValue}>
                      ${selectedDoctor?.price ? selectedDoctor.price.toLocaleString('es-MX') : '0.00'} MXN
                    </Text>
                  </View>
                </View>

                <View style={paymentStyles.paymentContainer}>
                  <Text style={paymentStyles.paymentTitle}>Método de pago</Text>
                  <Text style={paymentStyles.secureLabel}>Tarjetas seguras y encriptadas</Text>

                  <View style={paymentStyles.brandsContainer}>
                    <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Visa_2021.svg/1200px-Visa_2021.svg.png' }} style={paymentStyles.brandIcon} resizeMode="contain" />
                    <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/1200px-MasterCard_Logo.svg.png' }} style={paymentStyles.brandIcon} resizeMode="contain" />
                    <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/American_Express_logo.svg/1200px-American_Express_logo.svg.png' }} style={paymentStyles.brandIcon} resizeMode="contain" />
                  </View>

                  <CardField
                    postalCodeEnabled={false}
                    placeholders={{ number: '1234 1234 1234 1234' }}
                    cardStyle={{
                      backgroundColor: PAYMENT_COLORS.cardBg,
                      textColor: PAYMENT_COLORS.label,
                      placeholderColor: PAYMENT_COLORS.placeholder,
                    }}
                    style={paymentStyles.cardField}
                    onCardChange={(details) => setCardDetails(details)}
                  />

                  <Text style={paymentStyles.label}>Nombre del destinatario</Text>
                  <TextInput
                    style={paymentStyles.input}
                    placeholder="Nombre completo"
                    placeholderTextColor={PAYMENT_COLORS.placeholder}
                    value={cardName}
                    onChangeText={setCardName}
                    autoCapitalize="words"
                  />

                  {paymentError && (
                    <Text style={paymentStyles.errorText}>{paymentError}</Text>
                  )}

                  <TouchableOpacity 
                    style={paymentStyles.payButton}
                    onPress={handlePayment}
                    disabled={isProcessing || !cardDetails?.complete || !cardName}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color={PAYMENT_COLORS.buttonText} size="small" />
                    ) : (
                      <Text style={paymentStyles.payButtonText}>
                        Pagar ${selectedDoctor?.price ? selectedDoctor.price.toLocaleString('es-MX') : '0.00'} MXN
                      </Text>
                    )}
                  </TouchableOpacity>

                  <Text style={paymentStyles.termsText}>
                    Al pagar aceptas los Términos y Condiciones.
                  </Text>
                </View>

                <TouchableOpacity onPress={closeModal} style={styles.cancelButton} disabled={isProcessing}>
                  <Text style={styles.cancelButtonText}>CANCELAR</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-sharp" size={60} color={COLORS.white} />
                </View>
                <Text style={styles.successTitle}>¡Pago Completado!</Text>
                <Text style={styles.successMsg}>Tu transacción ha sido procesada con éxito.</Text>
                
                <TouchableOpacity 
                  style={styles.finalButton} 
                  onPress={() => {
                    closeModal();
                    setViewMode('pendientes');
                  }}
                >
                  <Text style={styles.finalButtonText}>VER CITAS PENDIENTES</Text>
                  <Ionicons name="time-outline" size={20} color={COLORS.white} style={{marginLeft: 10}} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL INFORMATIVO - NUTRIÓLOGO YA ASIGNADO (VERSIÓN REDUCIDA) */}
      <Modal
        visible={nutriologoInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNutriologoInfoModal(false)}
      >
        <View style={detailsModalStyles.overlay}>
          <View style={[detailsModalStyles.container, { width: '85%' }]}>
            <View style={[detailsModalStyles.header, { backgroundColor: COLORS.success, paddingVertical: 15 }]}>
              <View style={[detailsModalStyles.headerIcon, { width: 40, height: 40 }]}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
              </View>
              <Text style={[detailsModalStyles.headerTitle, { fontSize: 18 }]}>Ya es tu nutriólogo</Text>
              <TouchableOpacity 
                onPress={() => setNutriologoInfoModal(false)}
                style={[detailsModalStyles.closeButton, { width: 35, height: 35 }]}
              >
                <Ionicons name="close" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <View style={[detailsModalStyles.content, { padding: 20 }]}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <View style={{ 
                  width: 60, 
                  height: 60, 
                  borderRadius: 30, 
                  backgroundColor: COLORS.success + '20',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: COLORS.success,
                }}>
                  <Ionicons name="medical" size={30} color={COLORS.success} />
                </View>
                
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: '700',
                  color: COLORS.primary,
                  textAlign: 'center',
                  marginBottom: 5
                }}>
                  {selectedDoctor?.name || 'Este nutriólogo'}
                </Text>
                
                <Text style={{ 
                  fontSize: 14, 
                  color: COLORS.textLight,
                  textAlign: 'center',
                  lineHeight: 20
                }}>
                  Ya es tu nutriólogo de cabecera. Puedes agendar otra consulta directamente.
                </Text>
              </View>

              <TouchableOpacity 
                style={[detailsModalStyles.closeButton2, { backgroundColor: COLORS.primary, padding: 12 }]}
                onPress={() => setNutriologoInfoModal(false)}
              >
                <Text style={[detailsModalStyles.closeButtonText, { fontSize: 14 }]}>ENTENDIDO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerIcon: { padding: 5 },
  brandContainer: { alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 1.5 },
  underlineSmall: { width: 20, height: 3, backgroundColor: COLORS.accent, borderRadius: 2, marginTop: 2 },
  placeholder: { width: 40 },

  navBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 3,
  },
  navItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  navItemActive: {
    backgroundColor: COLORS.primary,
  },
  navText: {
    fontWeight: '800',
    color: COLORS.textLight,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  navTextActive: {
    color: COLORS.white,
  },

  scrollContent: { padding: 20, paddingBottom: 40 },
  introSection: { marginBottom: 30, alignItems: 'center' },
  mainTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textDark, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginTop: 8, fontWeight: '600', lineHeight: 20 },

  doctorCard: { backgroundColor: COLORS.white, padding: 18, borderRadius: 22, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: COLORS.border, elevation: 2 },
  avatarContainer: { width: 55, height: 55, borderRadius: 18, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  doctorInfo: { flex: 1, marginLeft: 15 },
  doctorName: { fontSize: 17, fontWeight: '900', color: COLORS.textDark },
  specialtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  specialtyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent, marginRight: 6 },
  doctorSpecialty: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  priceTag: { backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  priceText: { fontWeight: '900', color: COLORS.primary, fontSize: 14 },

  appointmentsSection: { marginTop: 30, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textDark },
  appointmentsList: { gap: 12 },
  appointmentCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 16, borderWidth: 2, borderColor: COLORS.border, elevation: 2 },
  appointmentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 8 },
  appointmentAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  appointmentDoctor: { fontSize: 16, fontWeight: '900', color: COLORS.primary, flex: 1 },
  appointmentFooter: { marginTop: 12, alignItems: 'flex-end' },
  viewDetailsButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary },
  viewDetailsText: { fontSize: 12, color: COLORS.primary, fontWeight: '800', marginRight: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  pendingBadge: { backgroundColor: COLORS.pendingLight, borderWidth: 1, borderColor: COLORS.pending },
  confirmedBadge: { backgroundColor: '#D4EDDA', borderWidth: 1, borderColor: COLORS.success },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  emptyAppointments: { backgroundColor: COLORS.white, borderRadius: 20, padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed' },
  emptyAppointmentsText: { fontSize: 16, fontWeight: '800', color: COLORS.textLight, marginTop: 12, textAlign: 'center' },
  emptyAppointmentsSubtext: { fontSize: 13, color: COLORS.textLight, marginTop: 8, textAlign: 'center', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 48, 38, 0.85)', justifyContent: 'flex-end' },
  paymentCard: { backgroundColor: COLORS.white, borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, minHeight: 500, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textDark, marginBottom: 25 },
  receiptContainer: { width: '100%', backgroundColor: COLORS.secondary, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 25 },
  receiptLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  receiptLabel: { color: COLORS.textLight, fontWeight: '700', fontSize: 14 },
  receiptValue: { color: COLORS.textDark, fontWeight: '800', fontSize: 14 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10, borderStyle: 'dashed', borderWidth: 0.5 },
  totalLabel: { fontSize: 18, fontWeight: '900', color: COLORS.textDark },
  totalValue: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  cancelButton: { padding: 20 },
  cancelButtonText: { color: COLORS.textLight, fontWeight: '800', fontSize: 14 },
  successContainer: { alignItems: 'center', width: '100%', paddingVertical: 20 },
  successIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 5 },
  successTitle: { fontSize: 26, fontWeight: '900', color: COLORS.primary, marginBottom: 10 },
  successMsg: { color: COLORS.textLight, fontWeight: '600', textAlign: 'center', fontSize: 15 },
  finalButton: { backgroundColor: COLORS.accent, width: '100%', padding: 20, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 35 },
  finalButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 16 },
  helpCard: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 20, borderRadius: 20, marginTop: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: COLORS.primary },
  helpText: { flex: 1, marginLeft: 12, fontSize: 12, color: COLORS.textDark, fontWeight: '700' },
  loadingContainer: { flex: 1, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  loadingContent: { alignItems: 'center', justifyContent: 'center' },
  iconsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  iconContainer: { marginHorizontal: 5 },
  loadingText: { fontSize: 18, fontWeight: '600', color: COLORS.primary, marginBottom: 20, textAlign: 'center' },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
});

const detailsModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.white,
    flex: 1,
  },
  closeButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  closeButton2: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },
});

const paymentStyles = StyleSheet.create({
  paymentContainer: {
    width: '100%',
    backgroundColor: PAYMENT_COLORS.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: PAYMENT_COLORS.border,
    marginVertical: 20,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PAYMENT_COLORS.label,
    marginBottom: 8,
  },
  secureLabel: {
    fontSize: 13,
    color: PAYMENT_COLORS.placeholder,
    marginBottom: 16,
  },
  brandsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  brandIcon: {
    width: 50,
    height: 30,
  },
  cardField: {
    width: '100%',
    height: 60,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: PAYMENT_COLORS.label,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: PAYMENT_COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    color: PAYMENT_COLORS.label,
    fontSize: 16,
    marginBottom: 16,
  },
  payButton: {
    backgroundColor: PAYMENT_COLORS.button,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  payButtonText: {
    color: PAYMENT_COLORS.buttonText,
    fontSize: 17,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 12,
    color: PAYMENT_COLORS.placeholder,
    textAlign: 'center',
    marginTop: 16,
  },
  errorText: {
    color: PAYMENT_COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
}); 