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

tournamentRouter.get("/knockout", async (_req, res, next) => {
  try {
    res.json({ knockout: await getKnockoutRounds() });
  } catch (error) {
    next(error);
  }
});

tournamentRouter.get("/fixtures", async (_req, res, next) => {
  try {
    res.json({ fixtures: await getFixtures() });
  } catch (error) {
    next(error);
  }
});

tournamentRouter.get("/table", async (_req, res, next) => {
  try {
    res.json({
      standings: await getStandings(),
      companyPicks: await getCompanyPicks(),
    });
  } catch (error) {
    next(error);
  }
});

tournamentRouter.get("/news", (_req, res) => {
  res.json({ news: getNews() });
});
