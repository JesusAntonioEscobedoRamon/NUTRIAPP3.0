import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Animated,
  RefreshControl,
  Dimensions,
  StatusBar,
  Easing,
  Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HamburgerMenu from '../components/HamburgerMenu';
import { usePoints } from '../context/PointsContext';
import { useProfileImage } from '../context/ProfileImageContext';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#2E8B57',
  secondary: '#F0FFF4',
  accent: '#3CB371',
  textDark: '#1A3026',
  textLight: '#4A4A4A',
  white: '#FFFFFF',
  border: '#D1E8D5',
};

// Componentes de animación (se mantienen igual)
const FloatingIcons = () => {
  const icons = ['leaf-outline', 'nutrition-outline', 'fitness-outline', 'heart-outline'];
  return (
    <View style={StyleSheet.absoluteFill}>
      {[...Array(6)].map((_, i) => (
        <SingleFloatingIcon key={i} name={icons[i % icons.length]} delay={i * 2000} />
      ))}
    </View>
  );
};

const SingleFloatingIcon = ({ name, delay }: any) => {
  const moveAnim = useRef(new Animated.Value(0)).current;
  const randomLeft = useRef(Math.random() * width).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(moveAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
        delay: delay
      })
    ).start();
  }, []);
  const translateY = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [height, -100]
  });
  return (
    <Animated.View style={{ position: 'absolute', left: randomLeft, transform: [{ translateY }], opacity: 0.05 }}>
      <Ionicons name={name} size={40} color={COLORS.primary} />
    </Animated.View>
  );
};

export default function DashboardScreen({ navigation }: any) {
  const { userPoints, todayPoints } = usePoints();
  const { profileImage } = useProfileImage(); // Consumimos el contexto
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const getRankData = () => {
    if (userPoints <= 100) return { name: "COBRE", next: "PLATA", target: 100, color: '#CD7F32' };
    if (userPoints <= 200) return { name: "PLATA", next: "ORO", target: 200, color: '#95A5A6' };
    return { name: "ORO", next: "MÁXIMO", target: userPoints, color: '#D4AF37' };
  };

  const rank = getRankData();
  const progress = (userPoints / rank.target) * 100;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  // --- LÓGICA DE IMAGEN CORREGIDA ---
  const getImageSource = () => {
    // Si la imagen en el contexto es la de defecto "usu.webp"
    if (profileImage === 'usu.webp') {
      return require('../../assets/usu.webp'); // Ruta relativa desde src/screens a assets/
    }
    // Si es una URL de internet o una ruta de archivo local (URI)
    return { uri: profileImage };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FloatingIcons />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerIcon}>
          <Ionicons name="menu-outline" size={28} color={COLORS.primary} />
        </TouchableOpacity>
        
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>NUTRI U</Text>
          <View style={styles.underlineSmall} />
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
          <Image 
            source={getImageSource()} 
            style={styles.headerAvatar} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Panel General</Text>
          <Text style={styles.subtitleText}>Estado actual de tu perfil</Text>
        </View>

        <TouchableOpacity 
          style={styles.pointsCard} 
          onPress={() => navigation.navigate('Points')}
          activeOpacity={0.8}
        >
          <View style={styles.pointsRow}>
            <View>
              <Text style={styles.pointsLabel}>PUNTOS ACUMULADOS</Text>
              <Text style={styles.pointsValue}>{userPoints}</Text>
            </View>
            <View style={[styles.rankBadge, { borderColor: rank.color }]}>
              <Text style={[styles.rankBadgeText, { color: rank.color }]}>{rank.name}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
            <View style={styles.progressInfo}>
              <Text style={styles.progressText}>Ver detalles de rango</Text>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          </View>

          {todayPoints > 0 && (
            <View style={styles.todayGain}>
              <Ionicons name="trending-up" size={16} color={COLORS.primary} />
              <Text style={styles.todayText}>Ganancia de hoy: +{todayPoints} pts</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
        
        <View style={styles.grid}>
          <ActionCard title="NUTRICIÓN" desc="Registro diario" icon="nutrition-outline" onPress={() => navigation.navigate('FoodTracking')} />
          <ActionCard title="GIMNASIO" desc="Mis rutinas" icon="barbell-outline" onPress={() => navigation.navigate('MyRoutines')} />
          <ActionCard title="CITAS" desc="Nutricionista" icon="calendar-outline" onPress={() => navigation.navigate('Schedule')} />
        </View>
      </ScrollView>

      <HamburgerMenu isVisible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </View>
  );
}

const ActionCard = ({ title, desc, icon, onPress }: any) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.cardIconCircle}>
      <Ionicons name={icon} size={28} color={COLORS.primary} />
    </View>
    <View style={styles.cardTextContainer}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </View>
  </TouchableOpacity>
);

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
  brandName: { fontSize: 20, fontWeight: '900', color: COLORS.primary, letterSpacing: 1.5 },
  underlineSmall: { width: 25, height: 3, backgroundColor: COLORS.accent, borderRadius: 2, marginTop: 2 },
  profileBtn: { padding: 2 },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#EEE'
  },
  scrollContent: { padding: 25 },
  welcomeContainer: { marginBottom: 25 },
  welcomeText: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  subtitleText: { fontSize: 14, color: COLORS.textLight, fontWeight: '300' },
  pointsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pointsLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textLight },
  pointsValue: { fontSize: 36, fontWeight: '900', color: COLORS.textDark, marginTop: 5 },
  rankBadge: { borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rankBadgeText: { fontSize: 10, fontWeight: '900' },
  progressSection: { marginTop: 20 },
  progressBarBg: { height: 8, backgroundColor: COLORS.secondary, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  todayGain: { flexDirection: 'row', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: COLORS.secondary, paddingTop: 10 },
  todayText: { fontSize: 12, color: COLORS.primary, fontWeight: 'bold', marginLeft: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 20, marginTop: 10 },
  grid: { flexDirection: 'column', gap: 12 },
  card: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2, 
    borderColor: COLORS.border,
    elevation: 3,
  },
  cardIconCircle: { 
    width: 50, height: 50, borderRadius: 12, 
    backgroundColor: COLORS.secondary, 
    justifyContent: 'center', alignItems: 'center', marginRight: 14, flexShrink: 0
  },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '900', color: COLORS.textDark },
  cardDesc: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
});