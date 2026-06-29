import { getSupabaseClient } from "../lib/supabase";
import { fixtures, knockout, news, teams } from "../data/tournamentData";
import type { ParticipantRecord, TeamView } from "../types";
import { getApiFootballFixtures, getApiFootballStandings } from "./apiFootballService";
import { computeStandingsFromFixtures, projectKnockoutRounds } from "./knockoutProjectionService";

const memoryStore = new Map<string, ParticipantRecord>();

function makeAppError(message: string, code: string, status: number) {
  const error = new Error(message);
  (error as Error & { code?: string; status?: number }).code = code;
  (error as Error & { code?: string; status?: number }).status = status;
  return error;
}

function getTeamName(teamCode: string) {
  return teams.find((team) => team.code === teamCode)?.name ?? teamCode;
}

async function listSelectionsFromSupabase(): Promise<ParticipantRecord[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return Array.from(memoryStore.values());
  }

  const { data, error } = await supabase
    .from("participant_selections")
    .select("device_id, display_name, team_code");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    deviceId: row.device_id,
    displayName: row.display_name,
    teamCode: row.team_code,
  }));
}

export async function listSelections() {
  return listSelectionsFromSupabase();
}

export async function getParticipantByDeviceId(deviceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return memoryStore.get(deviceId) ?? null;
  }

  const { data, error } = await supabase
    .from("participant_selections")
    .select("device_id, display_name, team_code")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    deviceId: data.device_id,
    displayName: data.display_name,
    teamCode: data.team_code,
  } satisfies ParticipantRecord;
}

function ensureTeamExists(teamCode: string) {
  if (!teams.some((team) => team.code === teamCode)) {
    throw makeAppError("Unknown team", "UNKNOWN_TEAM", 400);
  }
}

function makeConflictError() {
  return makeAppError("Selected team is no longer available.", "SELECTION_CONFLICT", 409);
}

function makeParticipantNotFoundError() {
  return makeAppError("Participant not found", "PARTICIPANT_NOT_FOUND", 404);
}

async function upsertToSupabase(input: ParticipantRecord) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { error } = await supabase.from("participant_selections").upsert(
    {
      device_id: input.deviceId,
      display_name: input.displayName,
      team_code: input.teamCode,
    },
    { onConflict: "device_id" },
  );

  if (error) {
    if (error.code === "23505") throw makeConflictError();
    throw error;
  }
}

export async function createSelection(input: ParticipantRecord) {
  ensureTeamExists(input.teamCode);

  const currentSelections = await listSelectionsFromSupabase();
  const conflict = currentSelections.find(
    (selection) => selection.teamCode === input.teamCode && selection.deviceId !== input.deviceId,
  );
  if (conflict) throw makeConflictError();

  const supabase = getSupabaseClient();
  if (!supabase) {
    memoryStore.set(input.deviceId, input);
    return input;
  }

  await upsertToSupabase(input);
  return input;
}

export async function changeSelection(input: ParticipantRecord) {
  ensureTeamExists(input.teamCode);

  const current = await getParticipantByDeviceId(input.deviceId);
  if (!current) {
    throw makeParticipantNotFoundError();
  }

  if (current.teamCode === input.teamCode) {
    if (current.displayName === input.displayName) {
      return current;
    }

    return updateDisplayName(input.deviceId, input.displayName);
  }

  const nextRecord = {
    ...current,
    displayName: input.displayName,
    teamCode: input.teamCode,
  };

  return createSelection(nextRecord);
}

export async function updateDisplayName(deviceId: string, displayName: string) {
  const current = await getParticipantByDeviceId(deviceId);
  if (!current) {
    throw makeParticipantNotFoundError();
  }

  const updated = { ...current, displayName };
  const supabase = getSupabaseClient();
  if (!supabase) {
    memoryStore.set(deviceId, updated);
    return updated;
  }

  const { error } = await supabase
    .from("participant_selections")
    .update({ display_name: displayName })
    .eq("device_id", deviceId);

  if (error) throw error;
  return updated;
}

export async function resetSelection(deviceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    memoryStore.delete(deviceId);
    return;
  }

  const { error } = await supabase.from("participant_selections").delete().eq("device_id", deviceId);
  if (error) throw error;
}

export async function getTeamsWithAvailability(): Promise<TeamView[]> {
  const selections = await listSelectionsFromSupabase();
  const byTeam = new Map(selections.map((selection) => [selection.teamCode, selection.displayName]));

  return teams.map((team) => ({
    ...team,
    isOwned: byTeam.has(team.code),
    ownedByName: byTeam.get(team.code),
  }));
}

export async function getCompanyPicks() {
  const selections = await listSelectionsFromSupabase();
  return selections
    .map((selection) => ({
      displayName: selection.displayName,
      teamCode: selection.teamCode,
      teamName: getTeamName(selection.teamCode),
      flag: teams.find((team) => team.code === selection.teamCode)?.flag ?? "🏳️",
    }))
    .sort((left, right) => left.teamName.localeCompare(right.teamName));
}

export async function getKnockoutRounds() {
  let apiFixtures;
  let apiStandings;

  try {
    [apiFixtures, apiStandings] = await Promise.all([
      getApiFootballFixtures(),
      getApiFootballStandings(),
    ]);
  } catch {
    return knockout;
  }

  if (!apiFixtures) {
    return knockout;
  }

  // If Football API standings unavailable, derive from fixture results
  const effectiveStandings = apiStandings ?? computeStandingsFromFixtures(apiFixtures);
  return projectKnockoutRounds(knockout, effectiveStandings, apiFixtures);
}

export async function getFixtures() {
  return (await getApiFootballFixtures()) ?? fixtures;
}

export async function getStandings() {
  const { standings: staticStandings } = await import("../data/tournamentData");
  return (await getApiFootballStandings()) ?? staticStandings;
}

export function getNews() {
  return news;
}

export function resetSelectionStoreForTests() {
  memoryStore.clear();
}
