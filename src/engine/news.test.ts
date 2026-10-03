import { newGame } from "./generate";
import { AI_FORMATION, autoLineup } from "./lineup";
import { appendNews, dateNews } from "./news";
import { playDate, playRound } from "./season";
import { atCupDate } from "./test-fixtures";
import type { Club, GameState, NewsDate, NewsItem, Tie } from "./types";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const ROUND7: NewsDate = { kind: "league", round: 7 };

/** The game before and after a date, the user at the third Série A club, no offers or transfers. */
function pair(seed = 5) {
  const before = newGame(seed);
  before.userClubId = before.leagues[0]!.clubs[2]!.id;
  before.market.offers = [];
  before.market.transfers = [];
  const after = clone(before);
  const mine = (s: GameState): Club => s.leagues[0]!.clubs[2]!;
  return { before, after, was: mine(before), me: mine(after) };
}

/** The item as dateNews builds it: the season and date first. */
const item = (after: GameState, date: NewsDate, rest: Record<string, unknown>) => ({ season: after.season, date, ...rest });

describe("notícias de uma data (noticias)", () => {
  test("notícia de lesão", () => {
    // C1 (AC 1, L-018): a new injury is news; one that was already there and goes down is not.
    const { before, after, was, me } = pair();
    me.players[3]!.injuryRounds = 3;
    was.players[5]!.injuryRounds = 2;
    me.players[5]!.injuryRounds = 1;
    expect(dateNews(before, after, ROUND7)).toEqual([item(after, ROUND7, { kind: "injury", playerName: me.players[3]!.name, rounds: 3 })]);
  });

  test("notícia de suspensão", () => {
    // C2 (AC 2, L-005, L-031): the league's, a cup's, and one served (no news).
    {
      const { before, after, me } = pair();
      me.players[4]!.suspendedRounds = 2;
      expect(dateNews(before, after, ROUND7), "liga").toEqual([item(after, ROUND7, { kind: "suspension", playerName: me.players[4]!.name, rounds: 2 })]);
    }
    {
      const { before, after, me } = pair();
      const cupDate: NewsDate = { kind: "cup", cupId: "cup-nat", phase: 1 };
      me.players[4]!.cupDiscipline = { "cup-nat": { yellowCards: 0, suspendedRounds: 1 } };
      expect(dateNews(before, after, cupDate), "copa").toEqual([item(after, cupDate, { kind: "suspension", playerName: me.players[4]!.name, rounds: 1, cupId: "cup-nat" })]);
    }
    {
      const { before, after, was, me } = pair();
      was.players[4]!.suspendedRounds = 1;
      me.players[4]!.suspendedRounds = 0;
      expect(dateNews(before, after, ROUND7), "cumprida").toEqual([]);
    }
  });

  test("notícia de força", () => {
    // C3 (AC 3, L-018): only the step logged in this round.
    const { before, after, was, me } = pair();
    Object.assign(me.players[2]!, { rating: 71, ratingLog: [{ round: 7, delta: 1 }] });
    was.players[6]!.ratingLog = [{ round: 6, delta: -1 }];
    me.players[6]!.ratingLog = [{ round: 6, delta: -1 }];
    expect(dateNews(before, after, ROUND7)).toEqual([item(after, ROUND7, { kind: "rating", playerName: me.players[2]!.name, rating: 71, delta: 1 })]);
  });

  test("notícia de proposta", () => {
    // C4 (AC 4): one per offer on a league round; none again on a cup date.
    const { before, after, me } = pair();
    const [x, y] = [after.leagues[0]!.clubs[5]!, after.leagues[0]!.clubs[9]!];
    after.market.offers = [
      { id: "o7-1", buyerId: x.id, playerId: me.players[1]!.id, amount: 1_200_000 },
      { id: "o7-2", buyerId: y.id, playerId: me.players[8]!.id, amount: 800_000 },
    ];
    expect(dateNews(before, after, ROUND7)).toEqual([
      item(after, ROUND7, { kind: "offer", playerName: me.players[1]!.name, clubId: x.id, amount: 1_200_000 }),
      item(after, ROUND7, { kind: "offer", playerName: me.players[8]!.name, clubId: y.id, amount: 800_000 }),
    ]);
    const cupBefore = clone(after);
    expect(dateNews(cupBefore, after, { kind: "cup", cupId: "cup-nat", phase: 1 }), "data de copa").toEqual([]);
  });

  test("notícia da diretoria e de emprego", () => {
    // C5 (AC 5, AC 6, L-005, L-031).
    {
      const { before, after } = pair();
      before.boardWarnings = 1;
      after.boardWarnings = 2;
      expect(dateNews(before, after, ROUND7), "aviso novo").toEqual([item(after, ROUND7, { kind: "board", warnings: 2 })]);
    }
    {
      const { before, after } = pair();
      before.boardWarnings = 2;
      after.boardWarnings = 2;
      expect(dateNews(before, after, ROUND7), "aviso igual").toEqual([]);
    }
    const ids = (s: GameState) => [s.leagues[0]!.clubs[0]!.id, s.leagues[0]!.clubs[1]!.id];
    {
      const { before, after } = pair();
      after.pendingJob = { reason: "offer", clubIds: ids(after) };
      expect(dateNews(before, after, ROUND7), "proposta nova").toEqual([item(after, ROUND7, { kind: "job", clubIds: ids(after) })]);
    }
    {
      const { before, after } = pair();
      before.pendingJob = { reason: "offer", clubIds: ids(before) };
      after.pendingJob = { reason: "offer", clubIds: ids(after) };
      expect(dateNews(before, after, ROUND7), "proposta antiga").toEqual([]);
    }
  });

  test("notícia de transferência", () => {
    // C6 (AC 7, L-018, L-031): the round's AI purchases with a side in the user's division.
    const { before, after } = pair();
    const division = after.leagues[0]!.clubs;
    const [b1, b2] = [after.leagues[1]!.clubs[0]!, after.leagues[1]!.clubs[1]!];
    const round12: NewsDate = { kind: "league", round: 12 };
    after.market.transfers = [
      { round: 12, kind: "buy", playerId: "p1", playerName: "Um", fromId: b1.id, toId: b2.id, amount: 100_000 },
      { round: 12, kind: "buy", playerId: "p2", playerName: "Dois", fromId: b1.id, toId: division[4]!.id, amount: 200_000 },
      { round: 11, kind: "buy", playerId: "p3", playerName: "Três", fromId: division[5]!.id, toId: division[6]!.id, amount: 300_000 },
      { round: 12, kind: "free", playerId: "p4", playerName: "Quatro", fromId: null, toId: division[7]!.id, amount: 400_000 },
      { round: 12, kind: "buy", playerId: "p5", playerName: "Cinco", fromId: division[8]!.id, toId: after.leagues[2]!.clubs[0]!.id, amount: 500_000 },
    ];
    expect(dateNews(before, after, round12)).toEqual([
      item(after, round12, { kind: "transfer", playerName: "Dois", fromId: b1.id, toId: division[4]!.id, amount: 200_000 }),
      item(after, round12, { kind: "transfer", playerName: "Cinco", fromId: division[8]!.id, toId: after.leagues[2]!.clubs[0]!.id, amount: 500_000 }),
    ]);
  });

  test("notícia de copa", () => {
    // C7 (AC 8, L-005): advanced, champion, out, and a date without the user's tie.
    const tie = (homeId: string, awayId: string, winnerId: string): Tie => ({
      id: "t",
      homeId,
      awayId,
      result: { homeGoals: 1, awayGoals: 0, goals: [] },
      penalties: null,
      winnerId,
    });
    const run = (phase: number, build: (me: string, x: string, other: string) => Tie) => {
      const { before, after } = pair();
      const me = after.userClubId!;
      const x = after.leagues[0]!.clubs[7]!.id;
      after.cups[0]!.phases[phase]!.ties = [tie(after.leagues[0]!.clubs[10]!.id, after.leagues[0]!.clubs[11]!.id, after.leagues[0]!.clubs[10]!.id), build(me, x, after.leagues[0]!.clubs[12]!.id)];
      const date: NewsDate = { kind: "cup", cupId: "cup-nat", phase };
      return { news: dateNews(before, after, date), after, date, x };
    };
    const last = newGame(5).cups[0]!.phases.length - 1;
    expect(last).toBe(5);
    {
      const r = run(2, (me, x) => tie(me, x, me));
      expect(r.news, "classificado").toEqual([item(r.after, r.date, { kind: "cup", cupId: "cup-nat", phase: 2, result: "advanced", opponentId: r.x })]);
    }
    {
      const r = run(last, (me, x) => tie(x, me, me));
      expect(r.news, "campeão").toEqual([item(r.after, r.date, { kind: "cup", cupId: "cup-nat", phase: last, result: "champion", opponentId: r.x })]);
    }
    {
      const r = run(2, (me, x) => tie(me, x, x));
      expect(r.news, "eliminado").toEqual([item(r.after, r.date, { kind: "cup", cupId: "cup-nat", phase: 2, result: "out", opponentId: r.x })]);
    }
    {
      const r = run(2, (_me, x, other) => tie(x, other, x));
      expect(r.news, "sem confronto do usuário").toEqual([]);
    }
  });

  test("ordem das notícias", () => {
    // C8 (AC 1-8): the fixed order of kinds, on a league round and on a cup date.
    {
      const { before, after, me } = pair();
      const division = after.leagues[0]!.clubs;
      // Added in reverse order, so the order comes from dateNews, not from the fixture.
      after.market.transfers = [{ round: 7, kind: "buy", playerId: "p9", playerName: "Nove", fromId: division[5]!.id, toId: division[6]!.id, amount: 100_000 }];
      after.pendingJob = { reason: "offer", clubIds: [division[0]!.id] };
      after.boardWarnings = 1;
      after.market.offers = [{ id: "o7-1", buyerId: division[3]!.id, playerId: me.players[1]!.id, amount: 500_000 }];
      Object.assign(me.players[2]!, { rating: 70, ratingLog: [{ round: 7, delta: -1 }] });
      me.players[4]!.suspendedRounds = 1;
      me.players[6]!.injuryRounds = 2;
      expect(dateNews(before, after, ROUND7).map((n) => n.kind)).toEqual(["injury", "suspension", "rating", "offer", "board", "job", "transfer"]);
    }
    {
      const { before, after, me } = pair();
      me.players[4]!.cupDiscipline = { "cup-nat": { yellowCards: 0, suspendedRounds: 1 } };
      me.players[6]!.injuryRounds = 2;
      const x = after.leagues[0]!.clubs[7]!.id;
      after.cups[0]!.phases[1]!.ties = [{ id: "t", homeId: after.userClubId!, awayId: x, result: { homeGoals: 2, awayGoals: 0, goals: [] }, penalties: null, winnerId: after.userClubId! }];
      expect(dateNews(before, after, { kind: "cup", cupId: "cup-nat", phase: 1 }).map((n) => n.kind)).toEqual(["cup", "injury", "suspension"]);
    }
  });

  test("guarda as 60 mais novas", () => {
    // C9 (AC 9, L-031): the 3 oldest go, the 5 new ones end the list; no user club, no news.
    const s = newGame(5);
    const at = (round: number): NewsItem => ({ season: 1, date: { kind: "league", round }, kind: "board", warnings: 1 });
    s.news = Array.from({ length: 58 }, (_, i) => at(i + 1));
    const fresh = [59, 60, 61, 62, 63].map(at);
    appendNews(s, fresh);
    expect(s.news).toHaveLength(60);
    expect(s.news.map((n) => (n.date.kind === "league" ? n.date.round : 0))).toEqual(Array.from({ length: 60 }, (_, i) => i + 4));

    const { before, after, me } = pair();
    me.players[3]!.injuryRounds = 3;
    after.market.offers = [{ id: "o7-1", buyerId: after.leagues[0]!.clubs[5]!.id, playerId: me.players[1]!.id, amount: 1_000_000 }];
    expect(dateNews(before, after, ROUND7)).toHaveLength(2);
    before.userClubId = null;
    after.userClubId = null;
    expect(dateNews(before, after, ROUND7)).toEqual([]);
  });

  test("fechamento guarda as notícias", () => {
    // C10 (AC 9): the closing of a league round and of a cup date keep what dateNews says.
    let s = newGame(8);
    s.userClubId = s.leagues[0]!.clubs[3]!.id;
    let found = false;
    for (let r = 0; r < 10 && !found; r++) {
      const me = s.leagues.flatMap((l) => l.clubs).find((c) => c.id === s.userClubId)!;
      me.lineup = autoLineup(me, AI_FORMATION);
      const out = playRound(s);
      const expected = dateNews(s, out.state, { kind: "league", round: out.roundNumber });
      const kept = out.state.news ?? [];
      expect(kept.slice(kept.length - expected.length), `rodada ${out.roundNumber}`).toEqual(expected);
      expect(kept.length - (s.news ?? []).length, `rodada ${out.roundNumber}`).toBe(expected.length);
      found = expected.length > 0;
      s = out.state;
    }
    expect(found).toBe(true);

    const cupDay = atCupDate(9, 0, null);
    const user = cupDay.cups[0]!.phases[0]!.ties[0]!.homeId;
    cupDay.userClubId = user;
    const me = cupDay.leagues.flatMap((l) => l.clubs).find((c) => c.id === user)!;
    me.lineup = autoLineup(me, AI_FORMATION);
    const out = playDate(cupDay);
    expect(out.cup).toBeDefined();
    const cupNews = (out.state.news ?? []).filter((n) => n.kind === "cup");
    expect(cupNews).toHaveLength(1);
    expect(cupNews[0]).toMatchObject({ kind: "cup", cupId: "cup-nat", phase: 0 });
  }, 60_000);
});
