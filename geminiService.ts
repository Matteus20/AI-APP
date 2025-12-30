
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, DailyTask, FoodItem } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Logic for initial plan generation.
 * Handles age-specific constraints:
 * - Children: Growth focus, no restriction.
 * - Teens: Balanced hormones, self-esteem, active habits.
 * - Adults: Metabolic health, stress management.
 * - Seniors: Bone density, sarcopenia prevention.
 */
export const getHealthPlan = async (user: UserProfile) => {
  const prompt = `
    Atue como um Especialista em Saúde Digital e Nutrição.
    Analise os dados:
    - Nome: ${user.name}
    - Idade: ${user.age} (${user.ageGroup})
    - Altura: ${user.height}cm
    - Peso: ${user.weight}kg
    - Objetivo: ${user.goalType === 'lose' ? 'Perder' : 'Ganhar'} peso (${user.goalWeight}kg)
    - Idioma: ${user.language}

    Regras de Segurança:
    1. NUNCA sugira dietas restritivas para crianças/adolescentes; foque em crescimento e alimentos integrais.
    2. Para idosos, foque em proteína e exercícios de baixo impacto.
    3. Para adultos, foque em consistência.
    4. Proíba ultraprocessados e excesso de açúcar.
    5. O tom deve ser encorajador e simples.

    Gere no idioma ${user.language}:
    1. 5 tarefas diárias (título, descrição, tipo: exercise/habit/food).
    2. Guia alimentar: 5 alimentos Permitidos e 5 Proibidos (nome, categoria, razão clara).
    3. Mensagem motivacional.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['exercise', 'habit', 'food'] }
              }
            }
          },
          foodGuide: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['permitted', 'prohibited'] },
                reason: { type: Type.STRING }
              }
            }
          },
          motivation: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text);
};

export const getCheckInAnalysis = async (user: UserProfile, history: any[]) => {
  const lastEntry = history[history.length - 1];
  const currentEntry = history[history.length - 2] || lastEntry;
  
  const prompt = `
    Analise o progresso semanal de ${user.name} (${user.ageGroup}).
    Peso anterior: ${currentEntry.weight}kg
    Peso atual: ${lastEntry.weight}kg
    Meta final: ${user.goalWeight}kg
    Idioma: ${user.language}

    Compare os dados. Se houve progresso, parabenize. Se estagnou, sugira um pequeno ajuste (ex: beber mais água, caminhar 10min a mais).
    FOCO: Saúde e bem-estar, não apenas estética.
    Linguagem simples, sem jargões.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
};
