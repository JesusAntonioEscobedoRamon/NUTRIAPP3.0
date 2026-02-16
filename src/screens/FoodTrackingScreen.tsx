import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useUser } from '../hooks/useUser';
import { foodService } from '../services/foodService';
import { supabase } from '../lib/supabase'; // Ruta correcta según tu estructura
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#2E8B57',
  secondary: '#F0FFF4',
  accent: '#3CB371',
  textDark: '#1A3026',
  textLight: '#4A4A4A',
  white: '#FFFFFF',
  border: '#D1E8D5',
  kcalBar: '#FF7043',
  ptsBar: '#42A5F5',
  disabled: '#E0E0E0',
};

const DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const MEALS = ['Desayuno', 'Almuerzo', 'Cena'];
const CALORIE_GOAL = 2000;
const POINTS_GOAL = 20;

export default function FoodTrackingScreen({ navigation }: any) {
  const { user, updatePoints } = useUser();
  const [viewMode, setViewMode] = useState('registro');
  const [selectedDay, setSelectedDay] = useState('LUNES');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [foods, setFoods] = useState<any[]>([]);
  const [todayHistory, setTodayHistory] = useState<any[]>([]);
  const [dietaRecomendada, setDietaRecomendada] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoaded, setUserLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('FoodTrackingScreen - Usuario cargado:', user);
      setUserLoaded(true);
    } else {
      console.log('FoodTrackingScreen - Esperando carga de usuario...');
    }
  }, [user]);

  useEffect(() => {
    if (!userLoaded || !user?.id_paciente) {
      setLoading(true);
      return;
    }

    const loadData = async () => {
      setLoading(true);

      // 1. Alimentos disponibles
      const { data: foodData, error: foodError } = await foodService.getAvailableFoods();
      if (foodError) {
        console.error('Error al cargar alimentos:', foodError);
        Alert.alert('Error', 'No se pudieron cargar los alimentos');
      } else {
        setFoods(foodData || []);
      }

      // 2. Historial de consumo del día
      const today = new Date().toISOString().split('T')[0];
      const { data: historyData, error: historyError } = await foodService.getFoodHistory(
        user.id_paciente,
        today,
        today
      );

      if (historyError) {
        console.error('Error al cargar historial:', historyError);
        Alert.alert('Error', 'No se pudo cargar el historial');
      } else {
        const mapped = (historyData || []).map((item: any) => ({
          id: item.id_registro,
          food: {
            id: item.id_alimento || `custom-${item.id_registro}`,
            name: item.alimento_personalizado || (item.alimentos?.nombre || 'Personalizado'),
            unit: item.unidad || 'g',
            kcalPerUnit: item.alimentos?.calorias_por_100g ? item.alimentos.calorias_por_100g / 100 : 0,
            pts: item.puntos_obtenidos || 0,
          },
          grams: item.cantidad,
          kcal: item.calorias_totales,
          points: item.puntos_obtenidos || 0,
        }));
        setTodayHistory(mapped);
      }

      // 3. Dieta recomendada por nutriólogo (corregido)
      const diaMap: { [key: string]: number } = {
        LUNES: 1,
        MARTES: 2,
        MIÉRCOLES: 3,
        JUEVES: 4,
        VIERNES: 5,
        SÁBADO: 6,
        DOMINGO: 7,
      };
      const diaNumero = diaMap[selectedDay] || 1;

      const { data: dietaData, error: dietaError } = await supabase
        .from('dieta_detalle')
        .select(`
          tipo_comida,
          descripcion,
          categoria,
          porcion_sugerida,
          calorias_por_100g,
          dietas!inner(id_paciente)  // ← Corregido: seleccionamos al menos id_paciente de dietas
        `)
        .eq('dietas.id_paciente', user.id_paciente)
        .eq('dia_semana', diaNumero)
        .in('tipo_comida', ['Desayuno', 'Almuerzo', 'Cena'])
        .order('orden', { ascending: true });

      if (dietaError) {
        console.error('Error cargando dieta recomendada:', dietaError);
        Alert.alert('Atención', 'No se pudo cargar tu plan nutricional del nutriólogo');
      } else {
        setDietaRecomendada(dietaData || []);
      }

      setLoading(false);
    };

    loadData();
  }, [userLoaded, user?.id_paciente, selectedDay]);

  const stats = useMemo(() => {
    const totalKcal = todayHistory.reduce((acc, curr) => acc + (curr.kcal || 0), 0);
    const totalPoints = todayHistory.reduce((acc, curr) => acc + (curr.points || 0), 0);

    return {
      totalKcal,
      kcalProgress: (totalKcal / CALORIE_GOAL) * 100,
      pointsProgress: (totalPoints / POINTS_GOAL) * 100,
      remainingKcal: Math.max(CALORIE_GOAL - totalKcal, 0),
      totalPoints,
    };
  }, [todayHistory]);

  const handleAmountChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    if (cleanText === '') { setAmount(''); return; }
    const numericValue = parseInt(cleanText);
    if (numericValue > (selectedFood?.max || 999)) {
      setAmount((selectedFood?.max || 999).toString());
    } else {
      setAmount(numericValue.toString());
    }
  };

  const isAlreadyRegistered = (foodId: string | number) =>
    todayHistory.some((h) => h.food.id === foodId);

  const confirmRegister = async () => {
    if (!user?.id_paciente) {
      Alert.alert('Error', 'No se encontró ID de paciente.');
      return;
    }

    const qty = parseInt(amount);
    if (!qty || qty <= 0) {
      Alert.alert('Atención', 'Ingresa una cantidad válida.');
      return;
    }

    const kcalTotal = qty * (selectedFood.kcalPerUnit || 0);
    const maxQty = selectedFood.max || 100;
    const pointsEarned = Math.round((qty / maxQty) * (selectedFood.pts || 3));
    const pointsFinal = Math.max(1, Math.min(pointsEarned, selectedFood.pts || 3));

    const payload = {
      id_alimento: selectedFood.id_alimento || null,
      cantidad: qty,
      unidad: selectedFood.unit || 'g',
      calorias_totales: kcalTotal,
      fecha: new Date().toISOString().split('T')[0],
    };

    const { error } = await foodService.registerFood(user.id_paciente, payload);

    if (error) {
      console.error('Error en registerFood:', error);
      Alert.alert('Error', 'No se pudo registrar: ' + (error.message || 'Desconocido'));
    } else {
      await updatePoints(pointsFinal);
      Alert.alert('Éxito', `¡${qty} ${selectedFood.unit || 'g'} registrados! +${pointsFinal} pts`);

      // Refrescar historial
      const today = new Date().toISOString().split('T')[0];
      const { data: newHistory } = await foodService.getFoodHistory(user.id_paciente, today, today);
      const mapped = (newHistory || []).map((item: any) => ({
        id: item.id_registro,
        food: {
          id: item.id_alimento || `custom-${item.id_registro}`,
          name: item.alimento_personalizado || (item.alimentos?.nombre || 'Personalizado'),
          unit: item.unidad || 'g',
          kcalPerUnit: item.alimentos?.calorias_por_100g ? item.alimentos.calorias_por_100g / 100 : 0,
          pts: item.puntos_obtenidos || 0,
        },
        grams: item.cantidad,
        kcal: item.calorias_totales,
        points: item.puntos_obtenidos || 0,
      }));
      setTodayHistory(mapped);

      setSelectedFood(null);
      setAmount('');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Cargando plan alimenticio...</Text>
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
          <Text style={styles.brandName}>PLAN SEMANAL</Text>
          <View style={styles.underlineSmall} />
        </View>
        <View style={styles.pointsPill}>
          <Text style={styles.pointsVal}>{stats.totalPoints || 0} PTS</Text>
        </View>
      </View>

      {/* NAVBAR */}
      <View style={styles.navBar}>
        {['registro', 'historial', 'progreso'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setViewMode(tab)}
            style={[styles.navItem, viewMode === tab && styles.navItemActive]}
          >
            <Text style={[styles.navText, viewMode === tab && styles.navTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {viewMode === 'registro' && (
        <View style={{ flex: 1 }}>
          <View style={styles.daysBarWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysBarContent}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={[styles.dayChip, selectedDay === day && styles.dayChipActive]}
                >
                  <Text style={[styles.dayText, selectedDay === day && styles.dayTextActive]}>
                    {day.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.planContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.dayTitle}>{selectedDay}</Text>

            {/* Dieta recomendada por nutriólogo */}
            {dietaRecomendada.length > 0 ? (
              MEALS.map((meal) => {
                const items = dietaRecomendada.filter((d) => d.tipo_comida === meal);
                if (items.length === 0) return null;

                return (
                  <View key={meal} style={styles.mealSection}>
                    <Text style={styles.mealTitle}>{meal.toUpperCase()}</Text>
                    {items.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.foodItem}
                        onPress={() => {
                          setSelectedFood({
                            id_alimento: null,
                            name: item.descripcion,
                            max: 100,
                            unit: item.porcion_sugerida?.includes('g') ? 'g' : 'unidad',
                            kcalPerUnit: item.calorias_por_100g ? item.calorias_por_100g / 100 : 1,
                            pts: 3,
                          });
                          setAmount('100');
                        }}
                      >
                        <View style={styles.foodContent}>
                          <View style={styles.foodInfo}>
                            <Text style={styles.foodName}>{item.descripcion}</Text>
                            <View style={styles.infoRow}>
                              <Text style={styles.foodDesc}>
                                Cal: ~{item.calorias_por_100g ? Math.round(item.calorias_por_100g) : '?'} kcal/100g
                              </Text>
                              {item.porcion_sugerida && (
                                <Text style={styles.foodDesc}> • {item.porcion_sugerida}</Text>
                              )}
                            </View>
                            <Text style={styles.foodNutrient}>
                              {item.categoria ? item.categoria.charAt(0).toUpperCase() + item.categoria.slice(1) : 'General'}
                            </Text>
                          </View>
                          <View style={styles.pointsBadge}>
                            <Text style={styles.ptsValue}>+3</Text>
                            <Text style={styles.ptsLabel}>pts</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No tienes dieta asignada para este día</Text>
            )}

            {/* Alimentos disponibles para registro manual */}
            {foods.length === 0 ? (
              <Text style={styles.emptyText}>No hay alimentos disponibles en la base de datos.</Text>
            ) : (
              MEALS.map((meal) => (
                <View key={meal} style={styles.mealSection}>
                  <Text style={styles.mealTitle}>{meal.toUpperCase()}</Text>
                  {foods
                    .filter(
                      (f) =>
                        f.categoria?.toLowerCase() === meal.toLowerCase() ||
                        f.nombre.toLowerCase().includes(meal.toLowerCase())
                    )
                    .map((food) => {
                      const registered = isAlreadyRegistered(food.id_alimento);
                      return (
                        <TouchableOpacity
                          key={food.id_alimento}
                          style={[
                            styles.foodItem,
                            registered && { opacity: 0.5, backgroundColor: COLORS.disabled },
                          ]}
                          disabled={registered}
                          onPress={() => {
                            if (!registered) {
                              setSelectedFood({
                                id_alimento: food.id_alimento,
                                name: food.nombre,
                                max: 100,
                                unit: food.porcion_estandar?.split(' ')[1] || 'g',
                                kcalPerUnit: food.calorias_por_100g ? food.calorias_por_100g / 100 : 1,
                                pts: 3,
                              });
                              setAmount('100');
                            } else {
                              Alert.alert('Bloqueado', 'Este alimento ya fue registrado hoy.');
                            }
                          }}
                        >
                          <View style={styles.foodContent}>
                            <View style={styles.foodInfo}>
                              <Text style={styles.foodName}>{food.nombre}</Text>
                              <Text style={styles.foodDesc}>
                                Cal: ~{Math.round(food.calorias_por_100g || 0)} kcal/100g
                              </Text>
                              <Text style={styles.foodNutrient}>{food.categoria || 'General'}</Text>
                            </View>
                            <View style={styles.pointsBadge}>
                              <Text style={styles.ptsValue}>+3</Text>
                              <Text style={styles.ptsLabel}>pts</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Historial */}
      {viewMode === 'historial' && (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.planContainer}>
            <Text style={styles.dayTitle}>Historial de Hoy</Text>
            {todayHistory.length > 0 ? (
              todayHistory.map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyContent}>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyFoodName}>{item.food.name}</Text>
                      <Text style={styles.historyDetail}>
                        {item.grams} {item.food.unit}
                      </Text>
                      <Text style={styles.historyNutrient}>
                        {item.food.nutrient || item.food.categoria || 'General'}
                      </Text>
                    </View>
                    <View style={styles.historyStats}>
                      <View style={styles.historyStatItem}>
                        <Text style={styles.historyKcal}>{Math.round(item.kcal)}</Text>
                        <Text style={styles.historyStatLabel}>kcal</Text>
                      </View>
                      <View style={styles.historyStatItem}>
                        <Text style={styles.historyPts}>+{item.points}</Text>
                        <Text style={styles.historyStatLabel}>pts</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No hay alimentos registrados hoy.</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Progreso */}
      {viewMode === 'progreso' && (
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.planContainer}>
            <Text style={styles.dayTitle}>Progreso del Día</Text>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>CALORÍAS</Text>
                <Text style={styles.progressValue}>
                  {Math.round(stats.totalKcal)} / {CALORIE_GOAL} kcal
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(stats.kcalProgress, 100)}%`,
                      backgroundColor: stats.kcalProgress > 100 ? '#FF6B6B' : COLORS.kcalBar,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressFooter}>
                <Text style={styles.progressInfo}>
                  {stats.remainingKcal > 0
                    ? `${Math.round(stats.remainingKcal)} kcal restantes`
                    : `${Math.round(stats.totalKcal - CALORIE_GOAL)} kcal excedidas`}
                </Text>
                <Text style={styles.progressPercent}>{Math.round(stats.kcalProgress)}%</Text>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>PUNTOS</Text>
                <Text style={styles.progressValue}>
                  {stats.totalPoints} / {POINTS_GOAL} pts
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(stats.pointsProgress, 100)}%`,
                      backgroundColor: stats.pointsProgress > 100 ? '#FFA500' : COLORS.ptsBar,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressFooter}>
                <Text style={styles.progressInfo}>
                  {stats.pointsProgress <= 100
                    ? `${Math.round(POINTS_GOAL - stats.totalPoints)} pts restantes`
                    : '¡Meta alcanzada!'}
                </Text>
                <Text style={styles.progressPercent}>{Math.round(stats.pointsProgress)}%</Text>
              </View>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>Resumen</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Alimentos registrados:</Text>
                <Text style={styles.summaryValue}>{todayHistory.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Promedio por alimento:</Text>
                <Text style={styles.summaryValue}>
                  {todayHistory.length > 0
                    ? Math.round(stats.totalKcal / todayHistory.length)
                    : 0}{' '}
                  kcal
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Modal de registro */}
      <Modal transparent visible={!!selectedFood} animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <View style={styles.sheet}>
              <Text style={styles.sheetName}>{selectedFood?.name}</Text>
              <Text style={styles.sheetLimit}>
                Cantidad (máx sugerido: {selectedFood?.max || 999})
              </Text>
              <View style={styles.inputArea}>
                <TextInput
                  style={styles.inputMassive}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  autoFocus
                />
                <Text style={styles.unitSmall}>
                  {selectedFood?.unit?.toUpperCase() || 'G'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.btnConfirm, !amount && { backgroundColor: COLORS.border }]}
                disabled={!amount}
                onPress={confirmRegister}
              >
                <Text style={styles.btnText}>CONFIRMAR REGISTRO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedFood(null)}
                style={styles.btnCancel}
              >
                <Text style={styles.btnCancelText}>CERRAR</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  headerIcon: { padding: 5 },
  brandContainer: { alignItems: 'center' },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  underlineSmall: {
    width: 30,
    height: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginTop: 2,
  },
  pointsPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pointsVal: { fontWeight: '900', color: COLORS.white, fontSize: 13 },

  navBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 5,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 3,
  },
  navItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  navItemActive: { backgroundColor: COLORS.primary },
  navText: { fontWeight: '800', color: COLORS.textLight, fontSize: 10 },
  navTextActive: { color: COLORS.white },

  daysBarWrapper: {
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  daysBarContent: {
    paddingHorizontal: 16,
  },
  dayChip: {
    width: 44,
    height: 44,
    marginRight: 10,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayText: { fontSize: 11, fontWeight: '900', color: COLORS.textLight },
  dayTextActive: { color: COLORS.white },

  planContainer: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: COLORS.secondary,
    paddingTop: 15,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 15,
  },
  mealSection: { marginBottom: 20 },
  mealTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  foodItem: {
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  foodContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 14, fontWeight: '900', color: COLORS.textDark },
  foodDesc: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  foodNutrient: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
    fontStyle: 'italic',
  },
  pointsBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ptsValue: { fontWeight: '900', color: COLORS.primary, fontSize: 13 },
  ptsLabel: { fontSize: 8, color: COLORS.primary, fontWeight: '700' },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  historyItem: {
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  historyContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyInfo: { flex: 1 },
  historyFoodName: { fontSize: 14, fontWeight: '900', color: COLORS.textDark },
  historyDetail: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  historyNutrient: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
    fontStyle: 'italic',
  },
  historyStats: { flexDirection: 'row', gap: 12 },
  historyStatItem: {
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyKcal: { fontWeight: '900', color: COLORS.kcalBar, fontSize: 12 },
  historyPts: { fontWeight: '900', color: COLORS.ptsBar, fontSize: 12 },
  historyStatLabel: { fontSize: 8, color: COLORS.textLight, fontWeight: '700' },

  progressSection: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressLabel: { fontSize: 12, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.8 },
  progressValue: { fontSize: 13, fontWeight: '800', color: COLORS.textDark },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 6, backgroundColor: COLORS.kcalBar },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressInfo: { fontSize: 11, color: COLORS.textLight, fontWeight: '600' },
  progressPercent: { fontSize: 12, fontWeight: '900', color: COLORS.primary },

  summarySection: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryTitle: { fontSize: 14, fontWeight: '900', color: COLORS.textDark, marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryLabel: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  summaryValue: { fontSize: 13, fontWeight: '900', color: COLORS.primary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    alignItems: 'center',
  },
  sheetName: { fontSize: 22, fontWeight: '900', color: COLORS.textDark },
  sheetLimit: { fontSize: 12, color: COLORS.primary, fontWeight: '800', marginTop: 5 },
  inputArea: { flexDirection: 'row', alignItems: 'baseline', marginVertical: 30 },
  inputMassive: { fontSize: 60, fontWeight: '900', color: COLORS.primary },
  unitSmall: { fontSize: 18, fontWeight: '700', marginLeft: 10, color: COLORS.textLight },
  btnConfirm: {
    width: '100%',
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnText: { color: COLORS.white, fontWeight: '900', fontSize: 14 },
  btnCancel: { marginTop: 10 },
  btnCancelText: { color: COLORS.textLight, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 20, color: COLORS.textLight },
});