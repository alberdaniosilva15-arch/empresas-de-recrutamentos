import { CandidateStatus } from "../types";

export const triggerWhatsAppNotification = async (
  candidateName: string,
  candidatePhone: string,
  status: CandidateStatus,
  jobTitle: string
) => {
  try {
    const response = await fetch("/api/notify-whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          name: candidateName,
          phone: candidatePhone,
          status: status,
          jobTitle: jobTitle,
          message: `Olá ${candidateName}, seu status para a vaga ${jobTitle} foi atualizado para: ${status}.`
        }
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send WhatsApp notification");
    }

    const result = await response.json();
    console.log("WhatsApp notification result:", result);
    return result;
  } catch (error) {
    console.error("Error triggering WhatsApp notification:", error);
    return null;
  }
};
