import { useEffect, useMemo, useState } from "react";
import {
  changeSelection,
  createSelection,
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
  handleSelectionSaved: (value: ParticipantSession) => void;
  startTeamChange: () => void;
  resetDevice: () => Promise<void>;
};

export function useParticipantSession(): SessionState {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [mode, setMode] = useState<"selection" | "home">("selection");
  const [participant, setParticipant] = useState<ParticipantSession | null>(null);
  const brandName = useMemo(
    () => import.meta.env.VITE_BRAND_NAME ?? "World Cup Festival 688",
    [],
  );

  useEffect(() => {
    const deviceId = getOrCreateDeviceId();

    fetchParticipant(deviceId)
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

        setMode("selection");
      })
      .catch(() => {
        const local = readSession();
        if (local && local.deviceId === deviceId) {
          setParticipant(local);
          setMode("home");
        } else {
          setMode("selection");
        }
      })
      .finally(() => {
        setStatus("ready");
      });
  }, []);

  const handleSelectionSaved = (value: ParticipantSession) => {
    saveSession(value);
    setParticipant(value);
    setMode("home");
  };

  const startTeamChange = () => {
    setMode("selection");
  };

  const resetDevice = async () => {
    const deviceId = participant?.deviceId ?? getOrCreateDeviceId();
    await resetDeviceRequest(deviceId);
    clearDeviceIdentity();
    setParticipant(null);
    setMode("selection");
  };

  return {
    status,
    mode,
    participant,
    brandName,
    handleSelectionSaved,
    startTeamChange,
    resetDevice,
  };
}
