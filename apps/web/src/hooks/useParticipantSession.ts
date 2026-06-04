import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchParticipant,
  resetDevice as resetDeviceRequest,
} from "../lib/api";
import { clearDeviceIdentity, getOrCreateDeviceId, readSession, saveSession } from "../lib/deviceIdentity";
import type { ParticipantSession } from "../lib/types";

type SessionState = {
  status: "loading" | "ready";
  mode: "selection" | "home";
  participant: ParticipantSession | null;
  brandName: string;
  sessionError: string;
  handleSelectionSaved: (value: ParticipantSession) => void;
  retrySession: () => void;
  startTeamChange: () => void;
  resetDevice: () => Promise<void>;
};

export function useParticipantSession(): SessionState {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [mode, setMode] = useState<"selection" | "home">("selection");
  const [participant, setParticipant] = useState<ParticipantSession | null>(null);
  const [sessionError, setSessionError] = useState("");
  const brandName = useMemo(
    () => import.meta.env.VITE_BRAND_NAME ?? "World Cup Festival 688",
    [],
  );

  const loadSession = useCallback(() => {
    const deviceId = getOrCreateDeviceId();
    setStatus("loading");
    setSessionError("");

    void fetchParticipant(deviceId)
      .then(({ participant: remoteParticipant }) => {
        if (remoteParticipant) {
          saveSession(remoteParticipant);
          setParticipant(remoteParticipant);
          setMode("home");
          return;
        }

        const local = readSession();
        if (local && local.deviceId === deviceId) {
          setParticipant(local);
          setMode("home");
          return;
        }

        setParticipant(null);
        setMode("selection");
      })
      .catch(() => {
        const local = readSession();
        if (local && local.deviceId === deviceId) {
          setParticipant(local);
          setMode("home");
        } else {
          setParticipant(null);
          setMode("selection");
          setSessionError("We could not verify your saved session. You can still pick a team.");
        }
      })
      .finally(() => {
        setStatus("ready");
      });
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleSelectionSaved = (value: ParticipantSession) => {
    saveSession(value);
    setParticipant(value);
    setMode("home");
  };

  const startTeamChange = () => {
    setSessionError("");
    setMode("selection");
  };

  const resetDevice = async () => {
    const deviceId = participant?.deviceId ?? getOrCreateDeviceId();
    await resetDeviceRequest(deviceId);
    clearDeviceIdentity();
    setParticipant(null);
    setSessionError("");
    setMode("selection");
  };

  return {
    status,
    mode,
    participant,
    brandName,
    sessionError,
    handleSelectionSaved,
    retrySession: loadSession,
    startTeamChange,
    resetDevice,
  };
}
