import React, { useState, useRef, useMemo } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, Animated, 
  Modal, ScrollView, Dimensions, Vibration, SafeAreaView, StatusBar 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
// Importamos tu contexto real
import { usePoints } from '../context/PointsContext'; 

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.65;

const COLORS = {
  primary: '#2E8B57',
  secondary: '#F0FFF4',
  accent: '#3CB371',
  textDark: '#1A3026',
  textLight: '#4A4A4A',
  white: '#FFFFFF',
  border: '#D1E8D5',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32'
};

const TROPHIES = [
  { id: 1, name: "Manzana de Cobre", pointsRequired: 100, color: COLORS.bronze, level: "Principiante", image: require('../../assets/premiocobre.png') },
  { id: 2, name: "Manzana de Plata", pointsRequired: 1000, color: COLORS.silver, level: "Intermedio", image: require('../../assets/premioplata.png') },
  { id: 3, name: "Manzana de Oro", pointsRequired: 5000, color: COLORS.gold, level: "Avanzado", image: require('../../assets/premiooro.png') },
  { id: 4, name: "Manzana de Diamante", pointsRequired: 10000, color: '#3498DB', level: "Leyenda", image: require('../../assets/premioplata.png') }
];

export default function PointsScreen({ navigation }: any) {
  // USANDO TU CONTEXTO REAL
  const { userPoints } = usePoints(); 
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const state = useMemo(() => {
    // Determinamos qué trofeos ha alcanzado el usuario basándonos en userPoints del contexto
    const list = TROPHIES.map(t => ({ ...t, achieved: userPoints >= t.pointsRequired }));
    const current = list[currentIdx];
    
    // El mejor trofeo alcanzado para mostrar en el modal
    const best = [...list].reverse().find(t => t.achieved) || list[0];
    
    // Lógica de progreso
    const prevPoints = currentIdx === 0 ? 0 : list[currentIdx - 1].pointsRequired;
    const diff = current.pointsRequired - prevPoints;
    const progress = Math.max(0, Math.min(1, (userPoints - prevPoints) / diff));
    const percentage = Math.round(progress * 100);
    
    return { list, current, best, progress, percentage };
  }, [userPoints, currentIdx]);

  const triggerShake = () => {
    Vibration.vibrate(80);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleNavigate = (dir: 'next' | 'prev') => {
    const next = dir === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (next >= 0 && next < TROPHIES.length) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true })
      ]).start();
      setCurrentIdx(next);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back-outline" size={26} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>MIS LOGROS</Text>
          <View style={styles.underlineSmall} />
        </View>
        <View style={styles.pointsBadgeHeader}>
          <Text style={styles.pointsBadgeText}>{userPoints} PTS TOTALES</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BARRA DE PROGRESO DE TROFEOS */}
        <View style={styles.trophyProgressSection}>
          <Text style={styles.trophyProgressTitle}>TU PROGRESIÓN</Text>
          <View style={styles.trophyProgressContainer}>
            {state.list.map((trophy, idx) => (
              <View key={trophy.id} style={styles.trophyProgressItem}>
                <TouchableOpacity
                  onPress={() => setCurrentIdx(idx)}
                  style={[
                    styles.trophyProgressIcon,
                    {
                      backgroundColor: trophy.achieved ? trophy.color : COLORS.border,
                      borderColor: currentIdx === idx ? trophy.color : COLORS.border,
                      borderWidth: currentIdx === idx ? 3 : 1
                    }
                  ]}
                >
                  {trophy.achieved && (
                    <Image source={trophy.image} style={styles.miniTrophyImg} />
                  )}
                  {!trophy.achieved && (
                    <Ionicons name="lock-closed" size={20} color={COLORS.textLight} />
                  )}
                </TouchableOpacity>
                <Text style={[styles.trophyProgressLabel, { opacity: trophy.achieved ? 1 : 0.5 }]}>
                  {trophy.pointsRequired}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.carouselContainer}>
          <TouchableOpacity onPress={() => handleNavigate('prev')} disabled={currentIdx === 0}>
            <Ionicons name="chevron-back" size={35} color={currentIdx === 0 ? '#E2E8F0' : COLORS.primary} />
          </TouchableOpacity>

          <Animated.View style={[styles.trophyCard, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={!state.current.achieved ? triggerShake : undefined}
              style={styles.imageBox}
            >
              <Image 
                source={state.current.image} 
                style={[styles.trophyImg, !state.current.achieved && { tintColor: '#000', opacity: 0.1 }]} 
              />
              {!state.current.achieved && (
                <Animated.View style={[styles.lockContainer, { transform: [{ translateX: shakeAnim.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) }] }]}>
                  <View style={styles.lockCircle}>
                    <Ionicons name="lock-closed" size={30} color={COLORS.white} />
                  </View>
                  <Text style={styles.lockText}>Faltan {state.current.pointsRequired - userPoints} pts</Text>
                </Animated.View>
              )}
            </TouchableOpacity>

            <Text style={styles.trophyName}>{state.current.name.toUpperCase()}</Text>
            <View style={[styles.levelBadge, { backgroundColor: state.current.color }]}>
              <Text style={styles.levelBadgeText}>{state.current.level}</Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${state.percentage}%`, backgroundColor: COLORS.primary }]} />
              </View>
              <Text style={styles.progressLabel}>{userPoints} / {state.current.pointsRequired} Puntos</Text>
            </View>
          </Animated.View>

          <TouchableOpacity onPress={() => handleNavigate('next')} disabled={currentIdx === TROPHIES.length - 1}>
            <Ionicons name="chevron-forward" size={35} color={currentIdx === TROPHIES.length - 1 ? '#E2E8F0' : COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* INFORMACIÓN DE PROGRESO */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PUNTOS ACTUALES</Text>
              <Text style={styles.infoValue}>{userPoints}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PRÓXIMO OBJETIVO</Text>
              <Text style={styles.infoValue}>{state.current.pointsRequired}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>AVANCE</Text>
              <Text style={[styles.infoValue, { color: state.current.color }]}>{state.percentage}%</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.rewardsButton} onPress={() => setShowModal(true)}>
          <Ionicons name="medal" size={22} color={COLORS.white} />
          <Text style={styles.rewardsButtonText}>VER TODOS MIS LOGROS</Text>
        </TouchableOpacity>

      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.textDark} />
            </TouchableOpacity>
            
            {/* Título */}
            <Text style={styles.modalMainTitle}>MIS LOGROS</Text>
            
            {/* Mejor logro */}
            <View style={[styles.bestAchievementCard, { borderColor: state.best.color }]}>
              <View style={[styles.bestAchievementIcon, { backgroundColor: state.best.color }]}>
                <Image source={state.best.image} style={styles.bestTrophyImg} />
              </View>
              <Text style={[styles.bestAchievementName, { color: state.best.color }]}>{state.best.name}</Text>
              <Text style={styles.bestAchievementLevel}>{state.best.level}</Text>
              <View style={styles.bestAchievementBadge}>
                <Ionicons name="checkmark-circle" size={24} color={state.best.color} />
                <Text style={[styles.bestAchievementStatus, { color: state.best.color }]}>DESBLOQUEADO</Text>
              </View>
            </View>

            {/* Todos los logros */}
            <View style={styles.allAchievementsSection}>
              <Text style={styles.allAchievementsTitle}>TODOS TUS LOGROS</Text>
              {state.list.map((trophy, idx) => (
                <View key={trophy.id} style={[styles.achievementRow, { opacity: trophy.achieved ? 1 : 0.5 }]}>
                  <View style={[styles.achievementRowIcon, { backgroundColor: trophy.color }]}>
                    <Image source={trophy.image} style={styles.achievementRowImg} />
                  </View>
                  <View style={styles.achievementRowInfo}>
                    <Text style={styles.achievementRowName}>{trophy.name}</Text>
                    <Text style={styles.achievementRowLevel}>{trophy.level} • {trophy.pointsRequired} pts</Text>
                  </View>
                  {trophy.achieved && (
                    <View style={styles.achievementRowCheck}>
                      <Ionicons name="checkmark" size={22} color={COLORS.primary} />
                    </View>
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.modalCloseButton, { backgroundColor: state.best.color }]} onPress={() => setShowModal(false)}>
              <Text style={styles.modalCloseButtonText}>CONTINUAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  pointsBadgeHeader: { backgroundColor: COLORS.secondary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  pointsBadgeText: { fontSize: 11, fontWeight: '900', color: COLORS.primary },
  scrollContent: { padding: 20, alignItems: 'center' },
  
  // TROPHY PROGRESS BAR
  trophyProgressSection: { width: '100%', marginBottom: 30 },
  trophyProgressTitle: { fontSize: 13, fontWeight: '900', color: COLORS.textLight, letterSpacing: 1.5, marginBottom: 15, textAlign: 'center' },
  trophyProgressContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trophyProgressItem: { alignItems: 'center', flex: 1 },
  trophyProgressIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3 },
  miniTrophyImg: { width: 40, height: 40, resizeMode: 'contain' },
  trophyProgressLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  
  // INFO SECTION
  infoSection: { width: '100%', marginVertical: 20 },
  infoCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textLight, letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  infoDivider: { height: 1, backgroundColor: COLORS.border },
  carouselContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between', marginVertical: 20 },
  trophyCard: { width: width * 0.7, backgroundColor: COLORS.white, borderRadius: 25, padding: 25, alignItems: 'center', borderWidth: 2, borderColor: COLORS.border, elevation: 3 },
  imageBox: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  trophyImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  lockContainer: { position: 'absolute', alignItems: 'center' },
  lockCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  lockText: { marginTop: 10, fontWeight: '900', color: COLORS.textLight, fontSize: 12, backgroundColor: COLORS.secondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  trophyName: { fontSize: 15, fontWeight: '900', color: COLORS.textDark, textAlign: 'center' },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  levelBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '900' },
  progressBarContainer: { width: '100%', marginTop: 20 },
  progressBarBg: { height: 8, backgroundColor: COLORS.secondary, borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 11, color: COLORS.textLight, textAlign: 'center', marginTop: 8, fontWeight: '800' },
  rewardsButton: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 18, borderRadius: 18, marginTop: 20, alignItems: 'center', width: '100%', justifyContent: 'center', marginBottom: 30, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  rewardsButtonText: { color: COLORS.white, fontWeight: '900', marginLeft: 12, fontSize: 14, letterSpacing: 0.5 },
  
  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 48, 38, 0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40, maxHeight: '90%' },
  closeBtn: { position: 'absolute', right: 20, top: 20, zIndex: 10 },
  modalMainTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', marginBottom: 25, letterSpacing: 1 },
  
  // BEST ACHIEVEMENT
  bestAchievementCard: { backgroundColor: COLORS.secondary, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 25, borderLeftWidth: 5 },
  bestAchievementIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 2 },
  bestTrophyImg: { width: 70, height: 70, resizeMode: 'contain' },
  bestAchievementName: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  bestAchievementLevel: { fontSize: 12, color: COLORS.textLight, fontWeight: '700', marginTop: 4 },
  bestAchievementBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: COLORS.white, borderRadius: 12 },
  bestAchievementStatus: { fontWeight: '900', fontSize: 11, marginLeft: 6, letterSpacing: 0.5 },
  
  // ALL ACHIEVEMENTS
  allAchievementsSection: { marginBottom: 20 },
  allAchievementsTitle: { fontSize: 12, fontWeight: '900', color: COLORS.textLight, letterSpacing: 1, marginBottom: 12 },
  achievementRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  achievementRowIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12, elevation: 1 },
  achievementRowImg: { width: 35, height: 35, resizeMode: 'contain' },
  achievementRowInfo: { flex: 1 },
  achievementRowName: { fontSize: 12, fontWeight: '900', color: COLORS.textDark },
  achievementRowLevel: { fontSize: 10, color: COLORS.textLight, fontWeight: '700', marginTop: 3 },
  achievementRowCheck: { paddingRight: 5 },
  
  modalCloseButton: { width: '100%', padding: 16, borderRadius: 18, alignItems: 'center', elevation: 2, marginTop: 10 },
  modalCloseButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 14, letterSpacing: 0.5 }
});