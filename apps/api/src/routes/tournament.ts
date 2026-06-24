import { Router } from "express";
import {
  getCompanyPicks,
  getFixtures,
  getKnockoutRounds,
  getStandings,
  getTeamsWithAvailability,
} from "../services/selectionService";
import { getNewsFromRss } from "../services/rssService";

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

tournamentRouter.get("/news", async (_req, res, next) => {
  try {
    const news = await getNewsFromRss();
    res.json({ news });
  } catch (error) {
    next(error);
  }
});
