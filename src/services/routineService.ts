import { supabase } from "../lib/supabase";

export const routineService = {
  getPatientRoutineExercises: async (id_paciente?: number) => {
    if (!id_paciente) {
      console.error(
        "[getPatientRoutineExercises] No id_paciente proporcionado",
      );
      return { data: [], error: "ID de paciente requerido" };
    }

    console.log(
      "[getPatientRoutineExercises] Buscando para id_paciente:",
      id_paciente,
    );

    const { data: rutinas, error: rutinaError } = await supabase
      .from("rutinas")
      .select("id_rutina")
      .eq("id_paciente", id_paciente)
      .eq("activa", true)
      .limit(1);

    if (rutinaError) {
      console.error(
        "[getPatientRoutineExercises] Error al buscar rutina:",
        rutinaError,
      );
      return { data: [], error: rutinaError.message || "Error desconocido" };
    }

    if (!rutinas?.length) {
      console.log("[getPatientRoutineExercises] No hay rutina activa");
      return { data: [], error: null };
    }

    const rutinaId = rutinas[0].id_rutina;
    console.log(
      "[getPatientRoutineExercises] Rutina encontrada, id_rutina:",
      rutinaId,
    );

    const { data, error } = await supabase
      .from("rutina_ejercicios")
      .select("*")
      .eq("id_rutina", rutinaId)
      .order("orden", { ascending: true });

    if (error) {
      console.error(
        "[getPatientRoutineExercises] Error al cargar ejercicios:",
        error,
      );
    }

    return { data: data || [], error: error?.message };
  },

  addExercise: async (id_paciente: number, exerciseData: any) => {
    console.log("[addExercise] Inicio =====================================");
    console.log("  - id_paciente:", id_paciente);
    console.log("  - exerciseData:", exerciseData);

    if (!id_paciente || isNaN(id_paciente)) {
      const errMsg = "ID de paciente inválido";
      console.error("[addExercise] " + errMsg);
      return { data: null, error: errMsg };
    }

    let rutinaId: number | null = null;

    // Buscar rutina activa
    console.log("[addExercise] Paso 1: Buscando rutina activa...");
    const { data: rutinas, error: findError } = await supabase
      .from("rutinas")
      .select("id_rutina")
      .eq("id_paciente", id_paciente)
      .eq("activa", true)
      .limit(1);

    if (findError) {
      console.error("[addExercise] Error buscando rutina:", findError);
      return { data: null, error: findError.message || findError };
    }

    if (rutinas?.length > 0) {
      rutinaId = rutinas[0].id_rutina;
      console.log("[addExercise] Rutina encontrada → id_rutina:", rutinaId);
    } else {
      // Crear rutina nueva
      console.log("[addExercise] No hay rutina → creando...");
      const rutinaPayload = {
        id_paciente: id_paciente,
        nombre: "Rutina Personal",
        descripcion: "Creada automáticamente desde la app",
        tipo_rutina: "mixta",
        nivel_dificultad: "principiante",
        activa: true,
      };

      console.log(
        "[addExercise] Insertando rutina con payload:",
        rutinaPayload,
      );

      const { data: newRutina, error: createError } = await supabase
        .from("rutinas")
        .insert(rutinaPayload)
        .select("id_rutina")
        .single();

      if (createError) {
        console.error("[addExercise] Error creando rutina:", createError);
        return { data: null, error: createError.message || createError };
      }

      if (!newRutina?.id_rutina) {
        const err = "No se obtuvo id_rutina después de crear";
        console.error("[addExercise] " + err);
        return { data: null, error: err };
      }

      rutinaId = newRutina.id_rutina;
      console.log("[addExercise] Rutina creada → id_rutina:", rutinaId);
    }

    // Obtener el siguiente orden (máximo actual + 1)
    const { data: maxOrdenData, error: maxError } = await supabase
      .from("rutina_ejercicios")
      .select("orden")
      .eq("id_rutina", rutinaId)
      .order("orden", { ascending: false })
      .limit(1);

    let nextOrden = 1;
    if (
      !maxError &&
      maxOrdenData?.length > 0 &&
      maxOrdenData[0].orden != null
    ) {
      nextOrden = (maxOrdenData[0].orden as number) + 1;
    }

    const seriesParsed = parseInt(exerciseData.sets) || 3;
    const repsTrimmed = exerciseData.reps.trim();
    const desc =
      exerciseData.duration !== "N/A"
        ? `Duración: ${exerciseData.duration}`
        : null;

    const ejercicioPayload = {
      id_rutina: rutinaId,
      nombre_ejercicio: exerciseData.name.trim(),
      series: seriesParsed,
      repeticiones: repsTrimmed,
      descripcion: desc,
      orden: nextOrden, // ← ¡Aquí está la corrección! Valor pequeño y secuencial
    };

    console.log(
      "[addExercise] Insertando ejercicio con payload:",
      ejercicioPayload,
    );

    const { data: inserted, error: insertError } = await supabase
      .from("rutina_ejercicios")
      .insert(ejercicioPayload)
      .select()
      .single();

    if (insertError) {
      console.error("[addExercise] ERROR al insertar ejercicio:", insertError);
      return { data: null, error: insertError };
    }

    console.log("[addExercise] ÉXITO - Ejercicio insertado:", inserted);
    console.log("[addExercise] Fin =====================================");

    return { data: inserted, error: null };
  },

  deleteExercise: async (id_ejercicio: number) => {
    console.log("[deleteExercise] Eliminando id_ejercicio:", id_ejercicio);

    const { error } = await supabase
      .from("rutina_ejercicios")
      .delete()
      .eq("id_ejercicio", id_ejercicio);

    if (error) {
      console.error("[deleteExercise] Error:", error);
      return { error: error.message || error };
    }

    console.log("[deleteExercise] Eliminado con éxito");
    return { error: null };
  },
};
