
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const getGeminiInsights = async (vehicleData: any, role: 'manager' | 'technician') => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const isManager = role === 'manager';
  
  const systemInstruction = isManager 
    ? "You are a Fleet Financial Strategist. Focus on ROI, SOH loss mitigation, and operational continuity. Speak in terms of cost and asset longevity."
    : "You are a Master EV Technician. Focus on XAI (Explainable AI), sensor drift, hardware stall patterns, and digital twin deviations. Speak in technical diagnostic terms.";

  const prompt = isManager 
    ? `Analyze this vehicle: ${JSON.stringify(vehicleData)}. Provide a high-level summary of the financial impact of the current thermal anomaly. Estimate potential SOH recovery value if fixed today vs delayed. Use bullet points.`
    : `Analyze this telemetry and twin baseline: ${JSON.stringify(vehicleData)}. Provide an XAI breakdown of why the real-world temp deviates from the twin. Identify the specific failure mode (e.g., thermal valve hysteresis, fan motor resistance).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    },
  });
  return response.text;
};

export const chatWithGemini = async (message: string, context: any) => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are the VoltFlow AI Assistant. You have access to real-time telemetry and digital twin models. Help the operator solve thermal issues immediately.",
    }
  });
  
  const response = await chat.sendMessage({ message: `Context: ${JSON.stringify(context)}. User Question: ${message}` });
  return response.text;
};
