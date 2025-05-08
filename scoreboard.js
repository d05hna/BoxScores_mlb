#!/usr/bin/env node
import figlet from "figlet";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import axios from "axios";
import stringWidth from "string-width";

/**
 * Pads a string to a target width, accounting for ANSI color codes using string-width.
 * @param {string} str - The string to pad.
 * @param {number} targetWidth - The target visual width of the string.
 * @returns {string} - The padded string.
 */
function padtoWidth(str, targetWidth) {
	const padding = Math.max(0, targetWidth - stringWidth(str));
	return str + ' '.repeat(padding);
}

/**
 * Renders a list of games in a terminal-friendly grid layout, each inside a box.
 * Includes team abbreviations, score details, game status, inning, and if live, the pitcher and batter.
 *
 * @param {Array<Object>} games - Array of game objects from the MLB Stats API.
 * @param {number} [gamesPerRow=2] - Number of games to display per row.
 * @param {number} [columnWidth=30] - Width of each game box in characters.
 */
function renderGameGrid(games, gamesPerRow = 2, columnWidth = 30) {
  /**
   * Formats a single game into a box with padding and colored info.
   * @param {Object} game - A single MLB game object.
   * @returns {Array<string>} - An array of strings representing each line of the formatted box.
   */
  const formatGameBox = (game) => {
    const home = game.teams.home.team.abbreviation;
    const away = game.teams.away.team.abbreviation;
    const status = game.status.detailedState;
    const inningHalf = game.linescore?.inningHalf;
		const inningNum = game.linescore?.currentInning;
		const inning = (inningHalf && inningNum) ? `${inningHalf} ${inningNum}` : '-';    const h = game.linescore?.teams?.home;
    const a = game.linescore?.teams?.away;
    const isLive = status.includes("In Progress");

		const pitcher = game.linescore?.defense?.pitcher?.fullName;
		const batter = game.linescore?.offense?.batter?.fullName;
		const winner = game.decisions?.winner?.fullName
		const loser = game.decisions?.loser?.fullName

    const statusColor = status.includes("Final")
      ? chalk.red 
      : status.includes("In Progress")
        ? chalk.green
        : chalk.yellow;

	const contentLines = [
	  padtoWidth(chalk.bold.white(`${away} @ ${home}`), columnWidth),
	  padtoWidth(`Status: ${statusColor(status)}`, columnWidth),
	  padtoWidth(`Inning: ${inning}`, columnWidth),
	  padtoWidth(
	    chalk.bgWhite.black(
	      `${padtoWidth(away, 6)} ${padtoWidth(`R:${a?.runs ?? '-'}`, 5)} ${padtoWidth(`H:${a?.hits ?? '-'}`, 5)} ${padtoWidth(`E:${a?.errors ?? '-'}`, 5)}`
	    ),
	    columnWidth
	  ),
	  padtoWidth(
	    chalk.bgWhite.black(
	      `${padtoWidth(home, 6)} ${padtoWidth(`R:${h?.runs ?? '-'}`, 5)} ${padtoWidth(`H:${h?.hits ?? '-'}`, 5)} ${padtoWidth(`E:${h?.errors ?? '-'}`, 5)}`
	    ),
	    columnWidth
	  ),
	  ...(isLive ? [
	    padtoWidth(chalk.cyan(`P: ${pitcher ?? "?"}`), columnWidth),
	    padtoWidth(chalk.magenta(`B: ${batter ?? "?"}`), columnWidth)
	  ] : status.includes("Final") ? [
  padtoWidth(chalk.cyan(`W: ${winner ?? "?"}`), columnWidth),
  padtoWidth(chalk.magenta(`L: ${loser ?? "?"}`),columnWidth), 
  padtoWidth(chalk.yellow(`S: ${game.decisions?.save?.fullName ?? "-"}`), columnWidth)
		] : [])
	];

	const borderTop = chalk.white('+' + '-'.repeat(columnWidth) + '+');
	const borderBottom = borderTop;
	const boxed = [borderTop, ...contentLines.map(line => chalk.white('|') + line + chalk.white('|')), borderBottom];

	return boxed;
  };

  for (let i = 0; i < games.length; i += gamesPerRow) {
    const chunk = games.slice(i, i + gamesPerRow);
    const boxes = chunk.map(formatGameBox);

    const maxHeight = Math.max(...boxes.map(box => box.length));
    const paddedBoxes = boxes.map(box => {
      const linesToAdd = maxHeight - box.length;
      const emptyLine = ' '.repeat(columnWidth);
      return [...box, ...Array(linesToAdd).fill(emptyLine)];
    });

    for (let line = 0; line < maxHeight; line++) {
      console.log(paddedBoxes.map(box => box[line]).join('  '));
    }
    console.log(); // spacing between rows
  }
}

// ==========================
// Runtime fetch + render
// ==========================

/**
 * Fetches MLB game schedule for a specific date and renders a styled CLI box score grid.
 */
const today = new Date().toISOString().split("T")[0];
const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&sportId=21&sportId=51&startDate=${today}&endDate=${today}&timeZone=America/New_York&gameType=E&gameType=S&gameType=R&gameType=F&gameType=D&gameType=L&gameType=W&gameType=A&gameType=C&=&=&=&=&=&=&=&=&=&=&=&=&=&=&=&=&=&=&=&=&=&=&language=en&leagueId=&leagueId=&leagueId=103&leagueId=104&leagueId=590&leagueId=160&leagueId=159&leagueId=420&leagueId=428&leagueId=431&leagueId=426&leagueId=427&leagueId=429&leagueId=430&leagueId=432&hydrate=team,linescore(matchup,runners),xrefId,story,flags,statusFlags,broadcasts(all),venue(location),decisions,person,probablePitcher,stats,game(content(media(epg),summary),tickets),seriesStatus(useOverride=true)&sortBy=gameDate,gameStatus,gameType`;
const response = await axios.get(url);
const data = response.data;

const games = data.dates?.[0]?.games || [];

if (games.length === 0) {
	console.log("No Games found.");
	process.exit();
}

console.log(chalk.green.bold(figlet.textSync("MLB Box Scores", { horizontalLayout: "full" })));

renderGameGrid(games, 3);
