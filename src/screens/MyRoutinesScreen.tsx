import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, StatusBar, TextInput, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../hooks/useUser';
import { routineService } from '../services/routineService';

const COLORS = {
  primary: '#2E8B57',
  secondary: '#F0FFF4',
  accent: '#3CB371',
  textDark: '#1A3026',
  textLight: '#4A4A4A',
  white: '#FFFFFF',
  border: '#D1E8D5',
  danger: '#FF6B6B'
};

export default function MyRoutinesScreen({ navigation }: any) {
  const { user, updatePoints } = useUser();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoaded, setUserLoaded] = useState(false); // Nuevo: para esperar carga de user

  // Estados del formulario
  const [newName, setNewName] = useState('');
  const [newSets, setNewSets] = useState('');
  const [newReps, setNewReps] = useState('');
  const [newDuration, setNewDuration] = useState('');

  useEffect(() => {
    if (user) {
      console.log('MyRoutinesScreen - Usuario cargado:', user);
      setUserLoaded(true);
      fetchExercises();
    } else {
      console.log('MyRoutinesScreen - Esperando carga de usuario...');
      setLoading(true);
    }
  }, [user]);

  useEffect(() => {
    if (userLoaded && !user?.id_paciente) {
      // Solo alerta si user ya cargó y aún no hay id_paciente (raro)
      Alert.alert('Error', 'No se encontró ID de paciente. Intenta cerrar y abrir sesión.');
      setLoading(false);
    }
  }, [userLoaded]);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await routineService.getPatientRoutineExercises(user?.id_paciente);
    if (error) {
      console.error('Error al cargar ejercicios:', error);
      Alert.alert('Error', 'No se pudieron cargar los ejercicios: ' + (error?.message || 'Desconocido'));
    } else {
      setExercises(data || []);
    }
    setLoading(false);
  };

  const handleAddExercise = async () => {
    if (!newName.trim() || !newSets.trim() || !newReps.trim()) {
      Alert.alert('Atención', 'Completa nombre, series y repeticiones.');
      return;
    }

    if (!user?.id_paciente) {
      console.error('No hay id_paciente disponible:', user);
      Alert.alert('Error crítico', 'No se encontró el ID del paciente.');
      return;
    }

    console.log('handleAddExercise - Intentando agregar para id_paciente:', user.id_paciente);

    const exerciseData = {
      name: newName.trim(),
      sets: newSets.trim(),
      reps: newReps.trim(),
      duration: newDuration.trim() || 'N/A',
    };

    const { data, error } = await routineService.addExercise(user.id_paciente, exerciseData);

    if (error) {
      console.error('ERROR COMPLETO al agregar ejercicio:', error);
      const errorMsg = error?.message 
        || error?.details 
        || error?.hint 
        || (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error));

      Alert.alert(
        'Error al registrar ejercicio',
        errorMsg || 'Error desconocido. Revisa la consola.'
      );
    } else {
      console.log('Éxito al agregar ejercicio:', data);
      await updatePoints(5);
      Alert.alert('Éxito', 'Ejercicio registrado y 5 puntos agregados!');
      fetchExercises();
    }

    // Limpiar formulario
    setNewName('');
    setNewSets('');
    setNewReps('');
    setNewDuration('');
  };

  const deleteExercise = async (id: number) => {
    console.log('deleteExercise - Eliminando id_ejercicio:', id);
    const { error } = await routineService.deleteExercise(id);

    if (error) {
      console.error('ERROR COMPLETO al eliminar:', error);
      const errorMsg = error?.message || JSON.stringify(error, null, 2);
      Alert.alert('Error al eliminar', errorMsg || 'Error desconocido');
    } else {
      Alert.alert('Éxito', 'Ejercicio eliminado');
      fetchExercises();
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Cargando rutinas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back-outline" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>MI REGISTRO</Text>
          <View style={styles.underlineSmall} />
        </View>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          <View style={styles.heroSection}>
            <Text style={styles.mainTitle}>Gestión de Rutina</Text>
            <Text style={styles.subtitle}>Crea y organiza tus ejercicios diarios</Text>
          </View>

          {/* FORMULARIO */}
          <View style={styles.registrationCard}>
            <Text style={styles.cardHeaderTitle}>Nuevo Ejercicio</Text>
            
            <TextInput 
              style={styles.input} 
              placeholder="Nombre del ejercicio (ej. Flexiones)" 
              value={newName}
              onChangeText={setNewName}
            />
            
            <View style={styles.rowInputs}>
              <TextInput 
                style={[styles.input, { flex: 1, marginRight: 10 }]} 
                placeholder="Series (ej. 3)" 
                keyboardType="numeric"
                value={newSets}
                onChangeText={setNewSets}
              />
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                placeholder="Reps (ej. 12)" 
                keyboardType="numeric"
                value={newReps}
                onChangeText={setNewReps}
              />
            </View>

            <TextInput 
              style={styles.input} 
              placeholder="Duración estimada (opcional, ej. 10 min)" 
              value={newDuration}
              onChangeText={setNewDuration}
            />

            <TouchableOpacity style={styles.addButton} onPress={handleAddExercise}>
              <Ionicons name="add-circle" size={20} color={COLORS.white} />
              <Text style={styles.addButtonText}>REGISTRAR EJERCICIO</Text>
            </TouchableOpacity>
          </View>

          {/* LISTA */}
          <Text style={styles.sectionHeader}>MI RUTINA ACTUAL</Text>
          
          {exercises.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No hay ejercicios registrados en tu rutina.</Text>
            </View>
          ) : (
            exercises.map((item: any) => (
              <View key={item.id_ejercicio} style={styles.exerciseCard}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{item.nombre_ejercicio}</Text>
                  <Text style={styles.exerciseDetails}>
                    {item.series} Series × {item.repeticiones} Reps • {item.descripcion || 'N/A'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteExercise(item.id_ejercicio)}>
                  <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.secondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerIcon: { padding: 5 },
  brandContainer: { alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 1.5 },
  underlineSmall: { width: 20, height: 3, backgroundColor: COLORS.accent, borderRadius: 2, marginTop: 2 },
  placeholder: { width: 40 },

  scrollView: { flex: 1, paddingHorizontal: 20 },
  heroSection: { marginVertical: 20 },
  mainTitle: { fontSize: 24, fontWeight: '900', color: COLORS.textDark },
  subtitle: { fontSize: 13, color: COLORS.textLight, fontWeight: '600' },

  registrationCard: {
    backgroundColor: COLORS.white,
    padding: 20, borderRadius: 25,
    borderWidth: 2, borderColor: COLORS.border,
    marginBottom: 25, elevation: 3
  },
  cardHeaderTitle: { fontSize: 16, fontWeight: '900', color: COLORS.primary, marginBottom: 15 },
  input: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 15, paddingVertical: 12,
    borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
    fontSize: 14, color: COLORS.textDark, fontWeight: '600'
  },
  rowInputs: { flexDirection: 'row' },
  addButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: 15, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 5
  },
  addButtonText: { color: COLORS.white, fontWeight: '900', marginLeft: 8, fontSize: 14 },

  sectionHeader: { fontSize: 12, fontWeight: '900', color: COLORS.primary, letterSpacing: 2, marginBottom: 15 },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 18, borderRadius: 20,
    alignItems: 'center', marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: '900', color: COLORS.textDark },
  exerciseDetails: { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textLight, fontWeight: '600', fontStyle: 'italic' },
  spacer: { height: 40 }
});