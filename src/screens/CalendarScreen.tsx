import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, SafeAreaView, StatusBar,
  Dimensions, BackHandler 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// Definir width (soluciona cualquier error previo)
const { width } = Dimensions.get('window');

// Paleta Nutri U (igual que tu versión)
const COLORS = {
  primary: '#2E8B57',
  secondary: '#F0FFF4',
  accent: '#3CB371',
  textDark: '#1A3026',
  textLight: '#4A4A4A',
  white: '#FFFFFF',
  border: '#D1E8D5',
  error: '#FF6B6B'
};

export default function CalendarScreen({ navigation, route }: any) {
  const { doctorName, doctorId } = route.params || { doctorName: 'el especialista seleccionado', doctorId: null };
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [occupiedDays, setOccupiedDays] = useState<number[]>([]);
  const [occupiedHours, setOccupiedHours] = useState<string[]>([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Horas con minutos y AM/PM (7:00 AM - 4:00 PM, intervalos de 30 min)
  const hours = [
    '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
    '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM'
  ];

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonthNum = today.getMonth();
  const currentYearNum = today.getFullYear();

  const isCurrentMonth = currentMonthIndex === currentMonthNum && currentYear === currentYearNum;

  const currentMonth = {
    month: months[currentMonthIndex],
    year: currentYear.toString(),
    days: new Date(currentYear, currentMonthIndex + 1, 0).getDate(),
    startDay: new Date(currentYear, currentMonthIndex, 1).getDay()
  };

  useEffect(() => {
    const fetchOccupiedDays = async () => {
      if (!doctorId) return;

      try {
        const { data, error } = await supabase
          .from('citas')
          .select('fecha_hora')
          .eq('id_nutriologo', doctorId)
          .eq('estado', 'confirmada');

        if (error) throw error;

        const occupied = data?.map(cita => new Date(cita.fecha_hora).getDate()) || [];
        setOccupiedDays([...new Set(occupied)]);
      } catch (err) {
        console.error('Error al cargar días ocupados:', err);
      }
    };

    fetchOccupiedDays();
  }, [doctorId, currentMonthIndex, currentYear]);

  useEffect(() => {
    const fetchOccupiedHours = async () => {
      if (!selectedDate || !doctorId) return;

      const selectedFullDate = new Date(currentYear, currentMonthIndex, parseInt(selectedDate));
      const startOfDay = selectedFullDate.toISOString().split('T')[0] + 'T00:00:00Z';
      const endOfDay = selectedFullDate.toISOString().split('T')[0] + 'T23:59:59Z';

      try {
        const { data, error } = await supabase
          .from('citas')
          .select('fecha_hora')
          .eq('id_nutriologo', doctorId)
          .gte('fecha_hora', startOfDay)
          .lte('fecha_hora', endOfDay)
          .eq('estado', 'confirmada');

        if (error) throw error;

        const occupied = data?.map(cita => {
          const date = new Date(cita.fecha_hora);
          const hour = date.getHours();
          const minute = date.getMinutes();
          const amPm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          return `${displayHour}:${minute.toString().padStart(2, '0')} ${amPm}`;
        }) || [];
        setOccupiedHours([...new Set(occupied)]);
      } catch (err) {
        console.error('Error al cargar horas ocupadas:', err);
      }
    };

    fetchOccupiedHours();
  }, [selectedDate, doctorId, currentMonthIndex, currentYear]);

  const generateCalendarDays = () => {
    const days = [];
    for (let i = 0; i < currentMonth.startDay; i++) {
      days.push({ day: '', empty: true, occupied: false });
    }
    for (let i = 1; i <= currentMonth.days; i++) {
      days.push({ day: i, empty: false, occupied: occupiedDays.includes(i) });
    }
    return days;
  };

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonthIndex(currentMonthIndex - 1);
    }
    setSelectedDate('');
    setSelectedHour('');
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonthIndex(currentMonthIndex + 1);
    }
    setSelectedDate('');
    setSelectedHour('');
  };

  const isSunday = (day: number) => {
    const date = new Date(currentYear, currentMonthIndex, day);
    return date.getDay() === 0;
  };

  const handleDayPress = (day: number) => {
    const selectedFullDate = new Date(currentYear, currentMonthIndex, day);
    const todayDate = new Date(currentYearNum, currentMonthNum, currentDay);
    if (selectedFullDate < todayDate) {
      Alert.alert('Atención', 'No puedes agendar citas en fechas pasadas.');
      return;
    }

    if (isSunday(day)) {
      Alert.alert('Atención', 'El consultorio está cerrado los domingos.');
      return;
    }

    if (day && !occupiedDays.includes(day)) {
      setSelectedDate(day.toString());
      setSelectedHour('');
    }
  };

  const handleHourPress = (hour: string) => {
    if (occupiedHours.includes(hour)) {
      Alert.alert('Hora no disponible', 'Esta hora ya está ocupada por otro paciente.');
      return;
    }
    setSelectedHour(hour);
  };

  const scheduleAppointment = () => {
    if (!selectedDate || !selectedHour) {
      Alert.alert('Atención', 'Por favor selecciona un día y una hora disponibles.');
      return;
    }
    setShowAlertModal(true);
  };

  const confirmFinalAppointment = async () => {
    setShowAlertModal(false);
    setShowConfirmation(true);

    try {
      const [timeStr, amPm] = selectedHour.split(' ');
      const [hourStr, minuteStr] = timeStr.split(':');
      let hourNum = parseInt(hourStr);
      if (amPm === 'PM' && hourNum !== 12) hourNum += 12;
      if (amPm === 'AM' && hourNum === 12) hourNum = 0;
      const fullDateTime = new Date(currentYear, currentMonthIndex, parseInt(selectedDate), hourNum, parseInt(minuteStr));
      await supabase
        .from('citas')
        .update({ fecha_hora: fullDateTime.toISOString() })
        .eq('id_nutriologo', doctorId)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (err) {
      console.error('Error al actualizar cita:', err);
      Alert.alert('Error', 'No se pudo confirmar la hora de la cita.');
    }
  };

  const confirmAppointment = () => {
    setShowConfirmation(false);
    setTimeout(() => {
      navigation.navigate('Dashboard');
    }, 300);
  };

  const handleBack = () => {
    Alert.alert('Espera', 'Debes seleccionar y confirmar una fecha antes de salir.');
  };

  // Bloquear botón físico de back en Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true; // Bloquea el back físico
    });

    return () => backHandler.remove();
  }, [selectedDate, showConfirmation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerIcon}>
          <Ionicons name="arrow-back-outline" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>CALENDARIO</Text>
          <View style={styles.underlineSmall} />
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.doctorInfoCard}>
          <Ionicons name="medical" size={20} color={COLORS.primary} />
          <Text style={styles.doctorText}>Cita con: <Text style={styles.bold}>{doctorName}</Text></Text>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{currentMonth.month} {currentMonth.year}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.weekDaysContainer}>
            {daysOfWeek.map((day) => (
              <Text key={day} style={styles.weekDayText}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {generateCalendarDays().map((item, index) => {
              const dayNum = item.day as number;
              const isPast = (currentYear < currentYearNum) || (currentYear === currentYearNum && currentMonthIndex < currentMonthNum) || (currentYear === currentYearNum && currentMonthIndex === currentMonthNum && dayNum < currentDay);
              const isSundayDay = isSunday(dayNum);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    item.empty && styles.emptyDay,
                    item.occupied && styles.occupiedDay,
                    !item.empty && selectedDate === item.day.toString() && styles.selectedDay,
                    isPast && styles.pastDay,
                    isSundayDay && styles.occupiedDay
                  ]}
                  onPress={() => !item.empty && !item.occupied && !isPast && !isSundayDay && setSelectedDate(item.day.toString())}
                  disabled={item.empty || item.occupied || isPast || isSundayDay}
                >
                  {!item.empty && (
                    <>
                      <Text style={[
                        styles.dayText,
                        item.occupied && styles.occupiedDayText,
                        selectedDate === item.day.toString() && styles.selectedDayText,
                        isPast && styles.occupiedDayText,
                        isSundayDay && styles.occupiedDayText
                      ]}>
                        {item.day}
                      </Text>
                      {(item.occupied || isSundayDay) && <View style={styles.occupiedDot} />}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Horas con botones bonitos */}
        <View style={styles.hourPickerContainer}>
          <Text style={styles.hourTitle}>Selecciona una hora (7 AM - 4 PM)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll}>
            {hours.map((hour) => {
              const isOccupied = occupiedHours.includes(hour);
              return (
                <TouchableOpacity
                  key={hour}
                  style={[
                    styles.hourButton,
                    selectedHour === hour && styles.selectedHourButton,
                    isOccupied && styles.occupiedHourButton
                  ]}
                  onPress={() => !isOccupied && setSelectedHour(hour)}
                  disabled={isOccupied}
                >
                  <Text style={[
                    styles.hourText,
                    selectedHour === hour && styles.selectedHourText,
                    isOccupied && styles.occupiedHourText
                  ]}>
                    {hour}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: COLORS.primary}]} /><Text style={styles.legendText}>Disponible</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor: '#E2E8F0'}]} /><Text style={styles.legendText}>Ocupado</Text></View>
        </View>

        <TouchableOpacity 
          style={[styles.mainButton, (!selectedDate || !selectedHour) && styles.disabledButton]} 
          onPress={scheduleAppointment}
          disabled={!selectedDate || !selectedHour}
        >
          <Text style={styles.mainButtonText}>CONFIRMAR CITA</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ALERTA MODAL ANTES DE CONFIRMAR */}
      <Modal visible={showAlertModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Confirmar Cita?</Text>
            <Text style={styles.modalText}>
              ¿Estás seguro de agendar tu cita el día {selectedDate} de {currentMonth.month} de {currentMonth.year} a las {selectedHour} con {doctorName}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAlertModal(false)}>
                <Text style={styles.modalCancelText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmFinalAppointment}>
                <Text style={styles.modalButtonText}>Sí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN FINAL */}
      <Modal visible={showConfirmation} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>¡Cita Confirmada!</Text>
            <Text style={styles.modalText}>
              Tu cita con <Text style={styles.bold}>{doctorName}</Text> ha sido registrada correctamente.
            </Text>
            <View style={styles.modalInfoPill}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.modalInfoText}>{selectedDate} de {currentMonth.month}, {currentMonth.year} a las {selectedHour}</Text>
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={confirmAppointment}>
              <Text style={styles.modalButtonText}>ENTENDIDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerIcon: { padding: 5 },
  brandContainer: { alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 1.5 },
  underlineSmall: { width: 20, height: 3, backgroundColor: COLORS.accent, borderRadius: 2, marginTop: 2 },
  placeholder: { width: 40 },

  scrollContent: { padding: 20 },
  doctorInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 20
  },
  doctorText: { marginLeft: 10, fontSize: 14, color: COLORS.textDark, fontWeight: '600' },
  bold: { fontWeight: '900', color: COLORS.primary },

  calendarCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 20
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  navButton: { padding: 8 },
  monthTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, textAlign: 'center' },
  weekDaysContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  weekDayText: { width: '14%', textAlign: 'center', fontSize: 12, fontWeight: '900', color: COLORS.textLight },
  
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayButton: {
    width: '14.28%',
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 12,
  },
  emptyDay: { backgroundColor: 'transparent' },
  occupiedDay: { backgroundColor: '#F1F5F9', opacity: 0.6 },
  selectedDay: { backgroundColor: COLORS.primary },
  pastDay: { backgroundColor: '#E5E7EB', opacity: 0.6 },
  dayText: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  occupiedDayText: { color: '#94A3B8', textDecorationLine: 'line-through' },
  selectedDayText: { color: COLORS.white, fontWeight: '900' },
  occupiedDot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.error },

  hourPickerContainer: { marginBottom: 20 },
  hourTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 10 },
  hourScroll: { marginTop: 10 },
  hourButton: { 
    backgroundColor: COLORS.secondary, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 12, 
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 90,
    alignItems: 'center'
  },
  selectedHourButton: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  occupiedHourButton: { backgroundColor: '#E5E7EB', opacity: 0.6 },
  hourText: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  selectedHourText: { color: COLORS.white },
  occupiedHourText: { color: COLORS.textLight },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 11, fontWeight: '700', color: COLORS.textLight },

  mainButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 18, alignItems: 'center' },
  disabledButton: { backgroundColor: '#CBD5E1' },
  mainButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 48, 38, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 30 },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 30, padding: 30, width: '100%', alignItems: 'center', borderWidth: 3, borderColor: COLORS.primary },
  successIconContainer: { marginBottom: 15 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: COLORS.primary, marginBottom: 10 },
  modalText: { textAlign: 'center', fontSize: 16, color: COLORS.textLight, lineHeight: 22, marginBottom: 20 },
  modalInfoPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.secondary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginBottom: 25, borderWidth: 1, borderColor: COLORS.border },
  modalInfoText: { marginLeft: 10, color: COLORS.primary, fontWeight: '800', fontSize: 15 },
  modalButton: { backgroundColor: COLORS.primary, width: '100%', padding: 18, borderRadius: 15, alignItems: 'center' },
  modalButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalCancelButton: { backgroundColor: COLORS.error, padding: 18, borderRadius: 15, alignItems: 'center', flex: 1, marginRight: 10 },
  modalCancelText: { color: COLORS.white, fontWeight: '900', fontSize: 14 },
  modalConfirmButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 15, alignItems: 'center', flex: 1 },
});