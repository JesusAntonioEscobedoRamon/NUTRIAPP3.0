import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export const useUser = () => {
  const { user: authUser, session } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session && authUser) {
      fetchUserData();
    } else {
      setUserData(null);
      setLoading(false);
      setError(null);
    }
  }, [session, authUser]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!authUser?.email) {
        setUserData(null);
        setLoading(false);
        return;
      }

      const email = authUser.email.toLowerCase();

      // Obtener datos del paciente con sus puntos
      const { data: pacienteData, error: pacienteError } = await supabase
        .from("pacientes")
        .select(
          `
          *,
          puntos_paciente (*)
        `,
        )
        .eq("correo", email)
        .single();

      if (pacienteError) {
        console.error("Error al cargar datos del paciente:", pacienteError);
        setError("No se pudo cargar la información del perfil");
        setUserData(null);
        return;
      }

      if (!pacienteData) {
        setError("No se encontró perfil de paciente para este usuario");
        setUserData(null);
        return;
      }

      // Formatear los datos del paciente
      setUserData({
        ...pacienteData,
        tipo_usuario: "paciente",
        puntos_totales: pacienteData.puntos_paciente?.[0]?.puntos_totales || 0,
        puntos_hoy: pacienteData.puntos_paciente?.[0]?.puntos_hoy || 0,
        nivel: pacienteData.puntos_paciente?.[0]?.nivel || "principiante",
      });
    } catch (error: any) {
      console.error("Error al cargar datos del paciente:", error);
      setError("Error al cargar información del perfil");
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      if (!authUser || !userData) {
        throw new Error("No hay usuario autenticado");
      }

      // Validar altura si se está actualizando
      if (updates.altura !== undefined) {
        const alturaStr = updates.altura.toString();
        if (alturaStr.includes(".")) {
          throw new Error("La altura debe ser ingresada sin punto decimal");
        }

        if (updates.altura < 50 || updates.altura > 250) {
          throw new Error("La altura debe estar entre 50 y 250 centímetros");
        }
      }

      // Validar peso si se está actualizando
      if (
        updates.peso !== undefined &&
        (updates.peso < 20 || updates.peso > 300)
      ) {
        throw new Error("El peso debe estar entre 20 y 300 kilogramos");
      }

      const { error: updateError } = await supabase
        .from("pacientes")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id_paciente", userData.id_paciente);

      if (updateError) throw updateError;

      await fetchUserData();
      return { success: true, message: "Perfil actualizado correctamente" };
    } catch (error: any) {
      console.error("Error al actualizar perfil:", error);
      return { success: false, error: error.message };
    }
  };

  // Función para actualizar puntos (para el sistema de gamificación)
  const updatePoints = async (puntosAgregados: number) => {
    try {
      if (!userData?.id_paciente) {
        throw new Error("No hay paciente identificado");
      }

      const { data: puntosActuales, error: puntosError } = await supabase
        .from("puntos_paciente")
        .select("*")
        .eq("id_paciente", userData.id_paciente)
        .single();

      if (puntosError) throw puntosError;

      const nuevosPuntosTotales =
        (puntosActuales.puntos_totales || 0) + puntosAgregados;
      const nuevosPuntosHoy =
        (puntosActuales.puntos_hoy || 0) + puntosAgregados;

      // Determinar nivel basado en puntos totales
      let nuevoNivel = "principiante";
      if (nuevosPuntosTotales >= 1000) nuevoNivel = "intermedio";
      if (nuevosPuntosTotales >= 5000) nuevoNivel = "avanzado";
      if (nuevosPuntosTotales >= 10000) nuevoNivel = "experto";

      const { error: updateError } = await supabase
        .from("puntos_paciente")
        .update({
          puntos_totales: nuevosPuntosTotales,
          puntos_hoy: nuevosPuntosHoy,
          nivel: nuevoNivel,
          ultima_actividad: new Date().toISOString().split("T")[0], // Solo fecha
          updated_at: new Date().toISOString(),
        })
        .eq("id_paciente", userData.id_paciente);

      if (updateError) throw updateError;

      // También crear registro en log_puntos
      await supabase.from("log_puntos").insert({
        id_paciente: userData.id_paciente,
        puntos: puntosAgregados,
        tipo_accion: "registro_alimento",
        descripcion: "Puntos por registrar alimento saludable",
        fecha: new Date().toISOString(),
      });

      await fetchUserData();
      return { success: true, message: "Puntos actualizados correctamente" };
    } catch (error: any) {
      console.error("Error al actualizar puntos:", error);
      return { success: false, error: error.message };
    }
  };

  return {
    user: userData,
    loading,
    error,
    updateProfile,
    updatePoints,
    refreshUserData: fetchUserData,
  };
};
