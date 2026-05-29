import { Router } from "express";
import {
  getCompanyPicks,
  getFixtures,
  getKnockoutRounds,
  getNews,
  getStandings,
  getTeamsWithAvailability,
} from "../services/selectionService";

export const tournamentRouter = Router();

tournamentRouter.get("/teams", async (_req, res, next) => {
  try {
    res.json({ teams: await getTeamsWithAvailability() });
  } catch (error) {
    next(error);
  }
});

tournamentRouter.get("/knockout", (_req, res) => {
  res.json({ knockout: getKnockoutRounds() });
});

tournamentRouter.get("/fixtures", (_req, res) => {
  res.json({ fixtures: getFixtures() });
});

tournamentRouter.get("/table", async (_req, res, next) => {
  try {
    res.json({
      standings: getStandings(),
      companyPicks: await getCompanyPicks(),
    });
  } catch (error) {
    next(error);
  }
});

tournamentRouter.get("/news", (_req, res) => {
  res.json({ news: getNews() });
});
