import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useUser } from '../hooks/useUser'; // ← Importa tu hook de usuario
import { supabase } from '../lib/supabase';

interface ProfileImageContextType {
  profileImage: string;
  setProfileImage: (image: string) => void;
}

const ProfileImageContext = createContext<ProfileImageContextType | undefined>(undefined);

interface ProfileImageProviderProps {
  children: ReactNode;
}

export const ProfileImageProvider: React.FC<ProfileImageProviderProps> = ({ children }) => {
  const { user, loading } = useUser(); // ← Usa el hook para tener el usuario
  const [profileImage, setProfileImage] = useState('usu.webp'); // Default

  useEffect(() => {
    if (loading || !user) return;

    // Si el usuario tiene foto_perfil guardada en BD
    if (user.foto_perfil && user.foto_perfil !== 'default_avatar.png' && user.foto_perfil !== 'usu.webp') {
      // Genera la URL pública directamente desde el path relativo
      const { data } = supabase.storage
        .from('perfiles')
        .getPublicUrl(user.foto_perfil);

      if (data?.publicUrl) {
        // Agrega timestamp para evitar caché y forzar recarga
        const urlWithCacheBuster = `${data.publicUrl}?t=${Date.now()}`;
        setProfileImage(urlWithCacheBuster);
        console.log('Foto de perfil cargada desde contexto:', urlWithCacheBuster);
      } else {
        console.warn('No se pudo generar URL pública para foto_perfil:', user.foto_perfil);
      }
    }
  }, [user, loading]); // Se ejecuta cada vez que user o loading cambian

  return (
    <ProfileImageContext.Provider value={{
      profileImage,
      setProfileImage
    }}>
      {children}
    </ProfileImageContext.Provider>
  );
};

export const useProfileImage = () => {
  const context = useContext(ProfileImageContext);
  if (context === undefined) {
    throw new Error('useProfileImage must be used within a ProfileImageProvider');
  }
  return context;
};