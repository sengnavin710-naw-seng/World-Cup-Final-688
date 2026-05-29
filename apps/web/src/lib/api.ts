import type {
  CompanyPick,
  Fixture,
  GroupStanding,
  KnockoutRound,
  NewsItem,
  ParticipantSession,
  Team
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message ?? "Request failed");
    (error as Error & { code?: string }).code = body.code;
    throw error;
  }

  return response.json() as Promise<T>;
}

export function fetchTeams() {
  return request<{ teams: Team[] }>("/api/tournament/teams");
}

export function fetchKnockout() {
  return request<{ knockout: KnockoutRound[] }>("/api/tournament/knockout");
}

export function fetchFixtures() {
  return request<{ fixtures: Fixture[] }>("/api/tournament/fixtures");
}

export function fetchStandings() {
  return request<{ standings: GroupStanding[]; companyPicks: CompanyPick[] }>("/api/tournament/table");
}

export function fetchNews() {
  return request<{ news: NewsItem[] }>("/api/tournament/news");
}

export function fetchParticipant(deviceId: string) {
  return request<{ participant: ParticipantSession | null }>(`/api/participant/session/${deviceId}`);
}

export function createSelection(payload: ParticipantSession) {
  return request<{ participant: ParticipantSession }>("/api/participant/select", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function changeSelection(payload: ParticipantSession) {
  return request<{ participant: ParticipantSession }>("/api/participant/change", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateDisplayName(deviceId: string, displayName: string) {
  return request<{ participant: ParticipantSession }>("/api/participant/display-name", {
    method: "PATCH",
    body: JSON.stringify({ deviceId, displayName })
  });
}

export function resetDevice(deviceId: string) {
  return request<{ ok: true }>("/api/participant/reset", {
    method: "POST",
    body: JSON.stringify({ deviceId })
  });
}
