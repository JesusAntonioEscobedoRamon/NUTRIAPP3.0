import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { useUser } from '../hooks/useUser';
import { useAuth } from '../context/AuthContext';
import { useProfileImage } from '../context/ProfileImageContext';
import { supabase } from '../lib/supabase';
import { KeyboardAvoidingView, Platform } from 'react-native';

const COLORS = {
  primary: '#2E8B57',
  secondary: '#F0FFF4',
  textDark: '#1A3026',
  textLight: '#4A4A4A',
  white: '#FFFFFF',
  border: '#D1E8D5',
  accent: '#3CB371',
  error: '#FF6B6B'
};

// ============ COMPONENTE INFOROW SEPARADO ============
const InfoRow = React.memo(({ 
  label, 
  icon, 
  value, 
  editable = false, 
  isEditing, 
  editedUser, 
  setEditedUser,
  fieldKey,
  isNumeric,
  multiline
}: any) => {
  const handleChangeText = (text: string) => {
    if (!setEditedUser) return;
    
    if (isNumeric) {
      if (label === 'Teléfono') {
        // Solo permitir números y máximo 10 dígitos
        if (/^\d*$/.test(text) && text.length <= 10) {
          setEditedUser((prev: any) => ({ ...prev, [fieldKey]: text }));
        }
      } else {
        // Permitir números y un punto decimal
        if (/^\d*(\.\d*)?$/.test(text)) {
          setEditedUser((prev: any) => ({ ...prev, [fieldKey]: text }));
        }
      }
    } else {
      setEditedUser((prev: any) => ({ ...prev, [fieldKey]: text }));
    }
  };

  // Formatear el valor mostrado
  const displayValue = (() => {
    if (!value) return 'No registrado';
    if (label === 'Peso' && !value.includes('kg')) {
      return `${value} kg`;
    }
    if (label === 'Altura' && !value.includes('cm')) {
      return `${value} cm`;
    }
    return value;
  })();

  const currentValue = isEditing && editable 
    ? (editedUser?.[fieldKey] !== undefined ? editedUser[fieldKey] : value)
    : displayValue;

  return (
    <View style={[
      styles.row,
      isEditing && editable && styles.rowEditing
    ]}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      {editable && isEditing ? (
        <TextInput
          style={styles.input}
          value={currentValue}
          onChangeText={handleChangeText}
          keyboardType={isNumeric ? 'numeric' : 'default'}
          autoCapitalize="none"
          returnKeyType="done"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? "top" : "center"}
          blurOnSubmit={true}
        />
      ) : (
        <Text style={styles.rowValue}>{currentValue}</Text>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Control de re-renderizados solo cuando sea necesario
  return (
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.editedUser?.[prevProps.fieldKey] === nextProps.editedUser?.[nextProps.fieldKey] &&
    prevProps.value === nextProps.value &&
    prevProps.editable === nextProps.editable
  );
});
// ============ FIN COMPONENTE INFOROW ============

export default function ProfileScreen({ navigation }: any) {
  const { user, loading, refreshUserData } = useUser();
  const { signOut } = useAuth();
  const { profileImage, setProfileImage } = useProfileImage();
  const [bmi, setBmi] = useState<string>('0');
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<any>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEditedUser({ ...user });
      if (user.peso && user.altura) {
        const h = parseFloat(user.altura) / 100;
        const w = parseFloat(user.peso);
        const calculatedBMI = h > 0 ? (w / (h * h)).toFixed(1) : "0";
        setBmi(calculatedBMI);
      }
      if (user.foto_perfil && user.foto_perfil !== 'default_avatar.png' && user.foto_perfil !== 'usu.webp') {
        const publicUrl = supabase.storage.from('perfiles').getPublicUrl(user.foto_perfil).data.publicUrl;
        setProfileImage(publicUrl);
      }
    }
  }, [user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos permisos para acceder a tus fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setLocalImageUri(uri);
      setProfileImage(uri);
      await uploadProfilePhoto(uri);
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    try {
      console.log('Subiendo foto desde:', uri);

      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `perfiles_mobile/${fileName}`;

      console.log('Path destino:', filePath);

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${fileExt}`,
      } as any);

      const { data, error } = await supabase.storage
        .from('perfiles')
        .upload(filePath, formData, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) {
        console.error('Error Supabase:', error.message);
        throw error;
      }

      console.log('Subida OK:', data);

      const { data: urlData } = supabase.storage.from('perfiles').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      if (!publicUrl) throw new Error('No URL pública');

      console.log('URL pública:', publicUrl);

      const { error: updateError } = await supabase
        .from('pacientes')
        .update({ foto_perfil: filePath })
        .eq('id_paciente', user.id_paciente);

      if (updateError) throw updateError;

      setProfileImage(publicUrl + `?t=${Date.now()}`);
      setLocalImageUri(null);
      refreshUserData();
      Alert.alert('Éxito', 'Foto de perfil actualizada y guardada.');
    } catch (err) {
      console.error('Error al subir foto:', err);
      Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.');
    }
  };

  const handleSave = async () => {
    if (!editedUser) return;

    if (editedUser.numero_celular && editedUser.numero_celular.length !== 10) {
      Alert.alert('Error', 'El teléfono debe tener exactamente 10 dígitos.');
      return;
    }

    if (editedUser.peso && parseFloat(editedUser.peso) > 600) {
      Alert.alert('Error', 'El peso no puede exceder 600 kg.');
      return;
    }

    if (editedUser.altura && parseFloat(editedUser.altura) > 300) {
      Alert.alert('Error', 'La altura no puede exceder 300 cm.');
      return;
    }

    try {
      const { error } = await supabase
        .from('pacientes')
        .update({
          nombre: editedUser.nombre,
          apellido: editedUser.apellido,
          nombre_usuario: editedUser.nombre_usuario,
          numero_celular: editedUser.numero_celular,
          peso: editedUser.peso,
          altura: editedUser.altura,
          objetivo: editedUser.objetivo,
          alergias: editedUser.alergias,
        })
        .eq('id_paciente', user.id_paciente);

      if (error) throw error;

      setIsEditing(false);
      refreshUserData();
      Alert.alert('Éxito', 'Perfil actualizado correctamente.');
    } catch (err) {
      console.error('Error al guardar perfil:', err);
      Alert.alert('Error', 'No se pudo guardar los cambios.');
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const calculateAge = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return '';
    const birthDate = new Date(fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} años`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={50} color={COLORS.error} />
        <Text style={styles.errorText}>No se pudo cargar el perfil</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.retryText}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.brandContainer}>
            <Text style={styles.brandName}>MI PERFIL</Text>
            <View style={styles.underlineSmall} />
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          
          <View style={styles.heroSection}>
            <View style={styles.avatarWrapper}>
              <Image 
                source={localImageUri || profileImage === 'usu.webp' 
                  ? require('../../assets/usu.webp') 
                  : { uri: profileImage }}
                style={styles.avatar} 
                key={profileImage}
                onError={(e) => console.log('Error en Image:', e.nativeEvent.error)}
              />
              <TouchableOpacity style={styles.editPhotoBadge} onPress={pickImage}>
                <Ionicons name="camera" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.nameText}>
              {user.nombre} {user.apellido}
            </Text>
            <Text style={styles.emailText}>{user.correo}</Text>
          </View>

          {/* ESTADÍSTICAS */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="star-circle" size={32} color={COLORS.primary} />
              <Text style={styles.statVal}>{user.puntos_totales || 0}</Text>
              <Text style={styles.statLab}>PUNTOS TOTALES</Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="scale-bathroom" size={32} color={COLORS.primary} />
              <Text style={styles.statVal}>{bmi}</Text>
              <Text style={styles.statLab}>MI IMC ACTUAL</Text>
            </View>
          </View>

          {/* INFORMACIÓN PERSONAL */}
          <View style={styles.infoBox}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>DATOS PERSONALES</Text>
              <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                <Text style={styles.editText}>{isEditing ? 'Cancelar' : 'Editar'}</Text>
              </TouchableOpacity>
            </View>
            
            {isEditing && (
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              </TouchableOpacity>
            )}

            <InfoRow 
              label="Nombre de usuario" 
              icon="at-outline" 
              value={user.nombre_usuario} 
              editable 
              isEditing={isEditing}
              editedUser={editedUser}
              setEditedUser={setEditedUser}
              fieldKey="nombre_usuario"
              isNumeric={false}
              multiline={false}
            />

            <InfoRow 
              label="Teléfono" 
              icon="call-outline" 
              value={user.numero_celular} 
              editable 
              isEditing={isEditing}
              editedUser={editedUser}
              setEditedUser={setEditedUser}
              fieldKey="numero_celular"
              isNumeric={true}
              multiline={false}
            />

            <InfoRow 
              label="Peso" 
              icon="speedometer-outline" 
              value={user.peso ? `${user.peso} kg` : ''} 
              editable 
              isEditing={isEditing}
              editedUser={editedUser}
              setEditedUser={setEditedUser}
              fieldKey="peso"
              isNumeric={true}
              multiline={false}
            />

            <InfoRow 
              label="Altura" 
              icon="resize-outline" 
              value={user.altura ? `${user.altura} cm` : ''} 
              editable 
              isEditing={isEditing}
              editedUser={editedUser}
              setEditedUser={setEditedUser}
              fieldKey="altura"
              isNumeric={true}
              multiline={false}
            />

            <InfoRow 
              label="Edad" 
              icon="calendar-outline" 
              value={calculateAge(user.fecha_nacimiento)} 
              editable={false}
              isEditing={isEditing}
            />

            <InfoRow 
              label="Género" 
              icon="person-outline" 
              value={user.genero === 'masculino' ? 'Masculino' : user.genero === 'femenino' ? 'Femenino' : 'Otro'} 
              editable={false}
              isEditing={isEditing}
            />

            <View style={{ marginTop: 20 }}>
              <Text style={styles.sectionTitle}>METAS Y SALUD</Text>
              
              <InfoRow 
                label="Objetivo" 
                icon="trophy-outline" 
                value={user.objetivo || 'Ninguna'} 
                editable 
                isEditing={isEditing}
                editedUser={editedUser}
                setEditedUser={setEditedUser}
                fieldKey="objetivo"
                isNumeric={false}
                multiline={true}
              />

              <InfoRow 
                label="Alergias" 
                icon="medical-outline" 
                value={user.alergias || 'Ninguna'} 
                editable 
                isEditing={isEditing}
                editedUser={editedUser}
                setEditedUser={setEditedUser}
                fieldKey="alergias"
                isNumeric={false}
                multiline={true}
              />
            </View>
          </View>

          {/* CERRAR SESIÓN */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ============ ESTILOS (EXACTAMENTE IGUALES) ============
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: COLORS.secondary 
  },
  loadingText: { marginTop: 10, color: COLORS.textLight },
  errorText: { marginTop: 10, color: COLORS.error, fontWeight: '600' },
  retryButton: { marginTop: 20, padding: 15, backgroundColor: COLORS.primary, borderRadius: 10 },
  retryText: { color: COLORS.white, fontWeight: 'bold' },
  
  header: {
    height: 70,
    backgroundColor: COLORS.white,
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 5,
  },
  placeholder: {
    width: 34, 
  },
  brandContainer: { alignItems: 'center' },
  brandName: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 2 },
  underlineSmall: { width: 25, height: 3, backgroundColor: COLORS.accent, borderRadius: 2, marginTop: 2 },
  
  scroll: { flex: 1, backgroundColor: COLORS.secondary },
  
  heroSection: {
    backgroundColor: COLORS.white,
    paddingVertical: 35,
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopWidth: 0,
  },
  avatarWrapper: {
    position: 'relative',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  avatar: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    borderWidth: 4, 
    borderColor: COLORS.primary 
  },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.accent,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  nameText: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: COLORS.textDark, 
    marginTop: 15 
  },
  emailText: { 
    fontSize: 14, 
    color: COLORS.textLight, 
    opacity: 0.7, 
    fontWeight: '600', 
    marginTop: 2 
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 15,
    marginTop: 25,
  },
  statCard: {
    backgroundColor: COLORS.white,
    width: '43%',
    paddingVertical: 20,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  statVal: { fontSize: 22, fontWeight: '900', color: COLORS.textDark, marginVertical: 4 },
  statLab: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },

  infoBox: {
    margin: 20,
    padding: 25,
    backgroundColor: COLORS.white,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: COLORS.primary, letterSpacing: 1.5 },
  editText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15
  },
  saveButtonText: { color: COLORS.white, fontWeight: '900', fontSize: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
  },
  rowEditing: {
    backgroundColor: COLORS.secondary + '80',
    borderRadius: 10,
    paddingVertical: 4
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { marginLeft: 12, fontSize: 14, fontWeight: '600', color: COLORS.textLight },
  rowValue: { fontSize: 14, fontWeight: '800', color: COLORS.textDark },
  input: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    width: '55%',
    fontSize: 14,
    color: COLORS.textDark,
    elevation: 1,
  },

  footer: { marginTop: 10, alignItems: 'center' },
  logoutText: { color: COLORS.error, fontWeight: '900', fontSize: 15, opacity: 0.8 },
});