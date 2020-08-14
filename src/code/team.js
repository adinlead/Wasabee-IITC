import WasabeeAgent from "./agent";
import { teamPromise } from "./server";

export default class WasabeeTeam {
  constructor(data) {
    if (typeof data == "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.log("corrupted team");
        return null;
      }
    }

    this.agents = new Array();
    this.id = data.id;
    this.name = data.name;
    this.fetched = Date.now();

    // convert to WasabeeAgents and push them into the agent cache
    for (const agent of data.agents) {
      this.agents.push(new WasabeeAgent(agent));
    }

    // push into team cache
    window.plugin.wasabee.teams.set(this.id, this);
  }

  static cacheGet(teamID) {
    if (window.plugin.wasabee.teams.has(teamID)) {
      return window.plugin.wasabee.teams.get(teamID);
    }
    return null;
  }

  static async waitGet(teamID, maxAgeSeconds = 60) {
    if (maxAgeSeconds > 0 && window.plugin.wasabee.teams.has(teamID)) {
      const t = window.plugin.wasabee.teams.get(teamID);
      if (t.fetch > Date.now() - 1000 * maxAgeSeconds) {
        console.log("returning team from cache");
        return t;
      }
    }

    try {
      const t = await teamPromise(teamID);
      return new WasabeeTeam(t);
    } catch (e) {
      console.log(e);
    }
    return null;
  }
}
