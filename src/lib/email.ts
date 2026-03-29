import { CandidateStatus } from "../types";

export const triggerCandidateEmail = async (
  to: string,
  candidateName: string,
  status: CandidateStatus,
  jobTitle: string
) => {
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, candidateName, status, jobTitle }),
    });

    if (!response.ok) {
      throw new Error("Failed to send email");
    }

    const result = await response.json();
    console.log("Email trigger result:", result);
    return result;
  } catch (error) {
    console.error("Error triggering email:", error);
    // We don't want to break the UI if email fails
    return null;
  }
};
