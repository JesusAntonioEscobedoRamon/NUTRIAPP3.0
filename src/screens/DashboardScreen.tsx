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
import { useUser } from '../hooks/useUser';
import { useProfileImage } from '../context/ProfileImageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Componentes de animación (sin cambios)
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
  const { user, refreshUserData } = useUser();
  const { profileImage } = useProfileImage();
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Puntos con fallback desde caché local si aún no carga
  const [localUserPoints, setLocalUserPoints] = useState(0);
  const [localTodayPoints, setLocalTodayPoints] = useState(0);

  // Carga inicial desde caché (instantáneo)
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cached = await AsyncStorage.getItem('dashboard_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          setLocalUserPoints(parsed.puntos_totales || 0);
          setLocalTodayPoints(parsed.puntos_hoy || 0);
        }
      } catch (e) {
        console.warn("Error leyendo caché dashboard:", e);
      }
    };
    loadCachedData();
  }, []);

  // Actualiza local cuando user llega fresco (y guarda en caché)
  useEffect(() => {
    if (user) {
      const newPoints = user?.puntos_totales || 0;
      const newToday = user?.puntos_hoy || 0;

      setLocalUserPoints(newPoints);
      setLocalTodayPoints(newToday);

      // Guardar en caché
      AsyncStorage.setItem('dashboard_cache', JSON.stringify({
        puntos_totales: newPoints,
        puntos_hoy: newToday,
        timestamp: Date.now(),
      })).catch(e => console.warn("Error guardando caché:", e));
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUserData(); // refresca datos reales
    setRefreshing(false);
  };

  // Lógica corregida de rango y manzana
  const getRankData = () => {
    const points = localUserPoints; // usamos el local para no esperar

    if (points >= 10000) {
      return { 
        name: "DIAMANTE", 
        next: "MÁXIMO", 
        target: points, 
        color: '#3498DB',
       
       
      };
    }
    if (points >= 5000) {
      return { 
        name: "DIAMANTE", 
        next: "LEYENDA", 
        target: 10000, 
        color: '#3498DB',
       
       
      };
    }
    if (points >= 1000) {
      return { 
        name: "ORO", 
        next: "DIAMANTE", 
        target: 5000, 
        color: '#D4AF37',
       
       
      };
    }
    if (points >= 100) {
      return { 
        name: "PLATA", 
        next: "ORO", 
        target: 1000, 
        color: '#C0C0C0',
       
       
      };
    }
    return { 
      name: "COBRE", 
      next: "PLATA", 
      target: 100, 
      color: '#CD7F32',
      
      
    };
  };

  const rank = getRankData();
  const progress = rank.target > localUserPoints ? (localUserPoints / rank.target) * 100 : 100;

  // Lógica de imagen (sin cambios)
  const getImageSource = () => {
    if (profileImage === 'usu.webp') {
      return require('../../assets/usu.webp');
    }
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
              <Text style={styles.pointsValue}>{localUserPoints}</Text>
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