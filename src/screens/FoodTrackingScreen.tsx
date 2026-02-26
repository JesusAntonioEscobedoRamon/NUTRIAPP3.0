import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { useUser } from '../hooks/useUser';
import { useNutriologo } from '../context/NutriologoContext';
import { foodService } from '../services/foodService';
import { supabase } from '../lib/supabase';
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
  inactiveDay: '#F1F5F9',
  todayDay: '#D4F4E2',
  activeDayText: '#2E8B57',
  blockedDay: '#EAEAEA',
  blockedText: '#AAAAAA',
  warning: '#FFA500',
  info: '#17A2B8',
};

const DAYS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
const MEALS = ['Desayuno', 'Colación 1', 'Almuerzo', 'Colación 2', 'Cena'];
const CALORIE_GOAL = 2000;
const POINTS_GOAL = 20;

export default function FoodTrackingScreen({ navigation }: any) {
  const { user, updatePoints } = useUser();
  const { 
    estadoNutriologo, 
    loading: nutriologoLoading, 
    nutriologo,
    refreshNutriologo,
    getMensajeEstado
  } = useNutriologo();
  
  const [viewMode, setViewMode] = useState('registro');
  const [selectedDay, setSelectedDay] = useState('LUNES');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [foods, setFoods] = useState<any[]>([]);
  const [todayHistory, setTodayHistory] = useState<any[]>([]);
  const [dietaRecomendada, setDietaRecomendada] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoaded, setUserLoaded] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [todayDayIndex, setTodayDayIndex] = useState(0);

  // Loading animation values
  const spinValue = useRef(new Animated.Value(0)).current;
  const leafScale = useRef(new Animated.Value(1)).current;
  const leafOpacity = useRef(new Animated.Value(0.5)).current;
  const loadingTextOpacity = useRef(new Animated.Value(0.3)).current;

  // Refrescar cuando la pantalla gana foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 FoodTracking enfocada - refrescando nutriólogo');
      refreshNutriologo();
    });
    return unsubscribe;
  }, [navigation]);

  // Detectar día actual al cargar y al regresar
  useEffect(() => {
    const updateToday = () => {
      const today = new Date();
      const dayIndex = today.getDay(); // 0 = domingo, 1 = lunes, ...
      const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      setTodayDayIndex(adjustedIndex);
      const dayName = DAYS[adjustedIndex];
      setSelectedDay(dayName);
    };

    updateToday();
    const unsubscribe = navigation.addListener('focus', updateToday);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (user) {
      setUserLoaded(true);
      loadTotalPoints();
    }
  }, [user]);

  const loadTotalPoints = async () => {
    if (!user?.id_paciente) return;

    try {
      const { data, error } = await supabase
        .from('puntos_paciente')
        .select('puntos_totales')
        .eq('id_paciente', user.id_paciente)
        .single();

      if (error) throw error;
      setTotalPoints(data?.puntos_totales || 0);
    } catch (err) {
      console.error('Error cargando puntos totales:', err);
    }
  };

  // Loading animation
  useEffect(() => {
    if (loading || nutriologoLoading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(leafScale, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(leafScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(leafOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(leafOpacity, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingTextOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(loadingTextOpacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [loading, nutriologoLoading]);

  const handleDayChange = (day: string) => {
    if (day === selectedDay) return;
    
    const dayIndex = DAYS.indexOf(day);
    
    // Bloquear días pasados
    if (dayIndex < todayDayIndex) {
      Alert.alert(
        'Día no disponible',
        'No puedes registrar alimentos en días pasados. Solo puedes registrar para hoy y días futuros.',
        [{ text: 'Entendido' }]
      );
      return;
    }
    
    setSelectedDay(day);
  };

  useEffect(() => {
    if (!userLoaded || !user?.id_paciente) {
      setLoading(true);
      return;
    }

    const loadData = async () => {
      setLoading(true);

      // Alimentos disponibles
      const { data: foodData } = await foodService.getAvailableFoods();
      setFoods(foodData || []);

      // Historial del día actual
      const today = new Date().toISOString().split('T')[0];
      const { data: historyData } = await foodService.getFoodHistory(user.id_paciente, today, today);
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

      // SOLO cargar dieta recomendada si TIENE NUTRIÓLOGO Y TIENE DIETA
      if (estadoNutriologo === 'asignado_con_dieta') {
        const diaMap = {
          LUNES: 1, MARTES: 2, MIÉRCOLES: 3, JUEVES: 4,
          VIERNES: 5, SÁBADO: 6, DOMINGO: 7,
        };
        const diaNumero = diaMap[selectedDay] || 1;

        const { data: dietaData } = await supabase
          .from('dieta_detalle')
          .select(`
            tipo_comida,
            descripcion,
            categoria,
            porcion_sugerida,
            calorias_por_100g,
            horario,
            dietas!inner(id_paciente)
          `)
          .eq('dietas.id_paciente', user.id_paciente)
          .eq('dia_semana', diaNumero)
          .in('tipo_comida', MEALS)
          .order('orden', { ascending: true });

        setDietaRecomendada(dietaData || []);
      } else {
        setDietaRecomendada([]);
      }
      
      setLoading(false);
    };

    loadData();
  }, [userLoaded, user?.id_paciente, selectedDay, estadoNutriologo]);

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

    setIsRegistering(true);

    try {
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
        Alert.alert('Error', 'No se pudo registrar: ' + (error.message || 'Desconocido'));
        setIsRegistering(false);
      } else {
        await updatePoints(pointsFinal);
        Alert.alert('Éxito', `¡${qty} ${selectedFood.unit || 'g'} registrados! +${pointsFinal} pts`);

        // Refrescar historial y puntos
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
        loadTotalPoints();

        setSelectedFood(null);
        setAmount('');
        setIsRegistering(false);
      }
    } catch (error) {
      console.error('Error al registrar:', error);
      Alert.alert('Error', 'Ocurrió un error al registrar el alimento.');
      setIsRegistering(false);
    }
  };

  const hasAnyDiet = useMemo(() => dietaRecomendada.length > 0, [dietaRecomendada]);

  const getDayStyle = (day: string) => {
    const dayIndex = DAYS.indexOf(day);
    const isSelected = selectedDay === day;
    const isToday = dayIndex === todayDayIndex;
    const isPast = dayIndex < todayDayIndex;

    if (isPast) {
      return {
        chip: { 
          ...styles.dayChip, 
          backgroundColor: COLORS.blockedDay, 
          borderColor: COLORS.disabled,
          opacity: 0.7,
        },
        text: { 
          ...styles.dayText, 
          color: COLORS.blockedText, 
          fontWeight: '500' 
        },
        isBlocked: true,
      };
    }

    if (isSelected) {
      return {
        chip: { 
          ...styles.dayChip, 
          backgroundColor: COLORS.primary, 
          borderColor: COLORS.primary 
        },
        text: { 
          ...styles.dayText, 
          color: COLORS.white, 
          fontWeight: '900' 
        },
        isBlocked: false,
      };
    }

    if (isToday) {
      return {
        chip: { 
          ...styles.dayChip, 
          backgroundColor: COLORS.todayDay, 
          borderColor: COLORS.border 
        },
        text: { 
          ...styles.dayText, 
          color: COLORS.activeDayText, 
          fontWeight: '800' 
        },
        isBlocked: false,
      };
    }

    return {
      chip: { 
        ...styles.dayChip, 
        backgroundColor: COLORS.inactiveDay, 
        borderColor: COLORS.disabled 
      },
      text: { 
        ...styles.dayText, 
        color: COLORS.textLight, 
        fontWeight: '600' 
      },
      isBlocked: false,
    };
  };

  const isSelectedDayPast = DAYS.indexOf(selectedDay) < todayDayIndex;

  const renderContentByNutriologoState = () => {
    if (isSelectedDayPast) {
      return (
        <View style={styles.blockedDayContainer}>
          <Ionicons name="lock-closed" size={50} color={COLORS.disabled} />
          <Text style={styles.blockedDayTitle}>Día no disponible</Text>
          <Text style={styles.blockedDayText}>
            No puedes registrar alimentos en días pasados.
            Solo puedes registrar para hoy y días futuros.
          </Text>
        </View>
      );
    }

    switch (estadoNutriologo) {
      case 'sin_asignar':
        return (
          <View style={styles.noDietContainer}>
            <Ionicons name="person-outline" size={60} color={COLORS.primary} style={styles.noDietIcon} />
            <Text style={styles.noDietTitle}>Sin Nutriólogo Asignado</Text>
            <Text style={styles.noDietText}>
              No tienes un nutriólogo asignado. Agenda una consulta para obtener un plan personalizado.
            </Text>
            <TouchableOpacity 
              style={styles.noDietButton}
              onPress={() => navigation.navigate('Schedule', { view: 'agendar' })} // ← CAMBIADO
            >
              <Text style={styles.noDietButtonText}>Agendar consulta</Text>
            </TouchableOpacity>
          </View>
        );

      case 'asignado_sin_dieta':
        return (
          <View style={[styles.noDietContainer, { backgroundColor: '#FFF3CD' }]}>
            <Ionicons name="time-outline" size={60} color="#FFA500" style={styles.noDietIcon} />
            <Text style={[styles.noDietTitle, { color: '#FFA500' }]}>Esperando asignación</Text>
            <Text style={styles.noDietText}>
              {nutriologo 
                ? `Tu nutriólogo ${nutriologo.nombre} ${nutriologo.apellido} aún no ha asignado tu plan alimenticio.`
                : 'Tu nutriólogo aún no ha asignado tu plan alimenticio.'}
            </Text>
            <Text style={[styles.noDietText, { marginTop: 5, fontWeight: '600' }]}>
              Espera a que tu nutriólogo asigne tu dieta personalizada.
            </Text>
          </View>
        );

      case 'asignado_con_dieta':
        if (!hasAnyDiet) {
          return (
            <View style={styles.noDietContainer}>
              <Ionicons name="restaurant-outline" size={60} color={COLORS.primary} style={styles.noDietIcon} />
              <Text style={styles.noDietTitle}>Sin dieta para este día</Text>
              <Text style={styles.noDietText}>
                No hay alimentos asignados para {selectedDay}. 
                Tu nutriólogo asignará tu plan semanal completo.
              </Text>
            </View>
          );
        }

        return MEALS.map((meal) => {
          const items = dietaRecomendada.filter((d) => d.tipo_comida === meal);
          if (items.length === 0) return null;

          return (
            <View key={meal} style={styles.mealSection}>
              <Text style={styles.mealTitle}>{meal.toUpperCase()}</Text>
              {items.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.foodItem, isRegistering && styles.disabledItem]}
                  onPress={() => {
                    if (!isRegistering) {
                      setSelectedFood({
                        id_alimento: null,
                        name: item.descripcion,
                        max: 100,
                        unit: item.porcion_sugerida?.includes('g') ? 'g' : 'unidad',
                        kcalPerUnit: item.calorias_por_100g ? item.calorias_por_100g / 100 : 1,
                        pts: 3,
                        horario: item.horario || null,
                      });
                      setAmount('100');
                    }
                  }}
                  disabled={isRegistering}
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
                        {item.horario && (
                          <Text style={styles.foodHorario}> • {new Date(`2000-01-01T${item.horario}`).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
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
        });

      default:
        return null;
    }
  };

  if (loading || nutriologoLoading) {
    const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContent}>
          <Animated.View
            style={[
              styles.leafContainer,
              {
                transform: [{ rotate: spin }, { scale: leafScale }],
                opacity: leafOpacity,
              },
            ]}
          >
            <Ionicons name="leaf" size={80} color={COLORS.primary} />
          </Animated.View>
          
          <Animated.Text style={[styles.loadingText, { opacity: loadingTextOpacity }]}>
            {nutriologoLoading ? 'Verificando asignación...' : 'Cargando tu plan alimenticio'}
          </Animated.Text>
          
          <View style={styles.dotsContainer}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    opacity: loadingTextOpacity.interpolate({ inputRange: [0.3, 1], outputRange: [0.3, 1] }),
                    transform: [{
                      scale: loadingTextOpacity.interpolate({ inputRange: [0.3, 1], outputRange: [0.8, 1.2] })
                    }]
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER CON PUNTOS */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back-outline" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>PLAN SEMANAL</Text>
          <View style={styles.underlineSmall} />
        </View>
        <View style={styles.pointsPill}>
          <Text style={styles.pointsVal}>{totalPoints} PTS</Text>
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
              {DAYS.map((day) => {
                const { chip, text, isBlocked } = getDayStyle(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => handleDayChange(day)}
                    style={chip}
                    disabled={isBlocked}
                  >
                    <Text style={text}>
                      {day.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView style={styles.planContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.dayTitle}>{selectedDay}</Text>

            

            {/* Contenido principal según estado */}
            {renderContentByNutriologoState()}
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
                  editable={!isRegistering}
                />
                <Text style={styles.unitSmall}>
                  {selectedFood?.unit?.toUpperCase() || 'G'}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.btnConfirm, 
                  (!amount || isRegistering) && { backgroundColor: COLORS.border }
                ]}
                disabled={!amount || isRegistering}
                onPress={confirmRegister}
              >
                {isRegistering ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.btnText}>CONFIRMAR REGISTRO</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!isRegistering) {
                    setSelectedFood(null);
                    setAmount('');
                  }
                }}
                style={styles.btnCancel}
                disabled={isRegistering}
              >
                <Text style={[styles.btnCancelText, isRegistering && { color: COLORS.disabled }]}>
                  CERRAR
                </Text>
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
  dayText: { fontSize: 11, fontWeight: '900', color: COLORS.textLight },

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
  disabledItem: {
    opacity: 0.5,
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
  foodHorario: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: '700',
    marginTop: 2,
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
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leafContainer: {
    marginBottom: 30,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  
  // Estilos para cuando no hay dieta
  noDietContainer: {
    backgroundColor: COLORS.white,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noDietIcon: {
    marginBottom: 15,
  },
  noDietTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  noDietText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  noDietButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  noDietButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },

  // Estilos para días bloqueados
  blockedDayContainer: {
    backgroundColor: COLORS.white,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  blockedDayTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textLight,
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  blockedDayText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },

  // Estilos para tarjeta de estado del nutriólogo
  nutriologoStatusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  nutriologoStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  nutriologoStatusTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 10,
  },
  nutriologoStatusText: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
    marginBottom: 15,
  },
  nutriologoStatusButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriologoStatusButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
    marginRight: 8,
  },
});