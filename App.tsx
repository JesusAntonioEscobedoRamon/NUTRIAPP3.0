import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text, Animated, StyleSheet, SafeAreaView } from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import { PointsProvider } from './src/context/PointsContext';
import { ProfileImageProvider } from './src/context/ProfileImageContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NutriologoProvider } from './src/context/NutriologoContext';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';

// Pantallas
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PointsScreen from './src/screens/PointsScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import MyDietScreen from './src/screens/MyDietScreen';
import MyRoutinesScreen from './src/screens/MyRoutinesScreen';
import CaloriesScreen from './src/screens/CaloriesScreen';
import FoodTrackingScreen from './src/screens/FoodTrackingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PhotoSelectionScreen from './src/screens/PhotoSelectionScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

const Stack = createStackNavigator();

// Barra de conexión
const ConnectionBar = ({ isConnected }: { isConnected: boolean | null }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#333333');
  const slideAnim = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    if (isConnected === null) return;

    let newMessage = '';
    let newColor = '#333333';

    if (!isConnected) {
      newMessage = 'Sin conexión a internet';
      newColor = '#333333';
    } else {
      newMessage = '¡Conexión restaurada!';
      newColor = '#4CAF50';
    }

    setMessage(newMessage);
    setBackgroundColor(newColor);
    setVisible(true);

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 4000);

    return () => clearTimeout(timer);
  }, [isConnected]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.connectionBar,
        { backgroundColor, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={styles.connectionText}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  connectionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  connectionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

// Navigator - recibe el ref como prop
const AppNavigator = ({ navigationRef }: { navigationRef: any }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E8B57" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Points" component={PointsScreen} />
            <Stack.Screen name="Schedule" component={ScheduleScreen} />
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="MyDiet" component={MyDietScreen} />
            <Stack.Screen name="MyRoutines" component={MyRoutinesScreen} />
            <Stack.Screen name="Calories" component={CaloriesScreen} />
            <Stack.Screen name="FoodTracking" component={FoodTrackingScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="PhotoSelection" component={PhotoSelectionScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  // Referencia al navigator para deep links
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;

      if (isConnected === null) {
        setIsConnected(connected);
      } else if (connected !== isConnected) {
        setIsConnected(connected);
      }
    });

    return () => unsubscribe();
  }, [isConnected]);

  // Manejo de deep links global
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      console.log('Deep link recibido:', url);
      
      // Extraer el token manualmente si es necesario
      let token = null;
      let type = null;
      
      if (url.includes('token=')) {
        const tokenMatch = url.match(/token=([^&]+)/);
        token = tokenMatch ? tokenMatch[1] : null;
      }
      
      if (url.includes('type=')) {
        const typeMatch = url.match(/type=([^&]+)/);
        type = typeMatch ? typeMatch[1] : null;
      }

      // También intentar con Linking.parse
      const parsed = Linking.parse(url);
      console.log('Parsed:', parsed);

      if (parsed.path === 'reset-password' || url.includes('reset-password')) {
        // Esperar un poco a que el navigator esté listo
        setTimeout(() => {
          if (navigationRef.current) {
            navigationRef.current.navigate('ResetPassword', { 
              token: token || parsed.queryParams?.token,
              type: type || parsed.queryParams?.type 
            });
          } else {
            console.warn('Navigation ref no disponible aún');
          }
        }, 500);
      }
    };

    // URL inicial (app abierta desde enlace)
    Linking.getInitialURL().then(url => {
      if (url) handleUrl({ url });
    });

    // Listener para deep links mientras la app está abierta
    const subscription = Linking.addEventListener('url', handleUrl);

    return () => subscription.remove();
  }, []);

  return (
    <StripeProvider
      publishableKey="pk_test_51SHfQCEJmmqziTyLShhDhG4ubMVUdUdPoZhxMw0J5kH1mmUSVs88Cp1xrcEFvnXe1JMHni9KJbJutu8IO9GSvzNJ00Ign5TdVx"
      urlScheme="nutriu"
    >
      <AuthProvider>
        {/* ✅ NUTRIOLOGO PROVIDER CORRECTAMENTE UBICADO */}
        <NutriologoProvider>
          <PointsProvider>
            <ProfileImageProvider>
              <SafeAreaView style={{ flex: 1 }}>
                <AppNavigator navigationRef={navigationRef} />
                <ConnectionBar isConnected={isConnected} />
              </SafeAreaView>
            </ProfileImageProvider>
          </PointsProvider>
        </NutriologoProvider>
      </AuthProvider>
    </StripeProvider>
  );
}