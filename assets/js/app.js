const DATA_PATH = "./assets/data/velogames-data.json";

function getDisplayCourseName(name) {
  const map = new Map([
    ["Critérium du Dauphiné", "Tour Auvergne Rhône Alpes"],
    ["Critérium", "Tour Auvergne Rhône Alpes"],
  ]);
  return map.get(name) || name;
}

function formatPoints(value) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value ?? 0);
}

function formatDate(value) {
  if (!value) {
    return "Date inconnue";
  }
  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function getLastPlayedPalmaresEntry(data) {
  return [...(data.palmares || [])].filter((entry) => entry.isPlayed).pop() || null;
}

function getNextUpcomingPalmaresEntry(data) {
  return (data.palmares || []).find((entry) => !entry.isPlayed) || null;
}

function computePlayerSummary(player) {
  const playedResults = player.results.filter((result) => result.rank !== null && result.rank !== undefined && result.rank !== "");
  const podiums = playedResults.filter((result) => typeof result.rank === "number" && result.rank <= 3).length;
  const wins = playedResults.filter((result) => result.rank === 1).length;
  const dns = playedResults.filter((result) => result.rank === "DNS").length;
  const bestRankValue = playedResults
    .filter((result) => typeof result.rank === "number")
    .reduce((best, result) => Math.min(best, result.rank), Number.POSITIVE_INFINITY);

  return {
    played: playedResults.length,
    podiums,
    wins,
    dns,
    bestRank: Number.isFinite(bestRankValue) ? bestRankValue : null,
  };
}

function getBadgeClass(rank) {
  if (rank === 1) return "is-rank-1";
  if (rank === 2) return "is-rank-2";
  if (rank === 3) return "is-rank-3";
  return "";
}

async function loadData() {
  const response = await fetch(DATA_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Impossible de charger les données du site.");
  }
  return response.json();
}

function setupBackToTop() {
  const button = document.querySelector("[data-back-to-top]");
  if (!button) return;

  const toggleVisibility = () => {
    button.classList.toggle("is-visible", window.scrollY > 320);
  };

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", toggleVisibility, { passive: true });
  toggleVisibility();
}

function renderMeta(data) {
  const titleNode = document.querySelector("[data-site-title]");
  const lastUpdatedNode = document.querySelector("[data-last-updated]");
  if (titleNode) titleNode.textContent = data.meta.siteTitle;
  if (lastUpdatedNode) lastUpdatedNode.textContent = formatDate(data.meta.lastUpdated);
}

function renderHero(data) {
  const leader = data.home.globalRanking[0];
  const runnerUp = data.home.globalRanking[1];
  const leaderPoints = document.querySelector("[data-leader-points]");
  const leaderName = document.querySelector("[data-leader-name]");
  const lastRace = document.querySelector("[data-last-race]");
  const nextRace = document.querySelector("[data-next-race]");
  const playedCount = document.querySelector("[data-played-count]");
  const gapCopy = document.querySelector("[data-leader-gap-copy]");
  const lastPlayedCourse = getLastPlayedPalmaresEntry(data);
  const nextUpcomingCourse = getNextUpcomingPalmaresEntry(data);

  if (leaderPoints) leaderPoints.textContent = formatPoints(leader.points);
  if (leaderName) leaderName.textContent = leader.name;
  if (lastRace) {
    lastRace.textContent = lastPlayedCourse ? getDisplayCourseName(lastPlayedCourse.course) : "Aucune course jouée";
  }
  if (nextRace) {
    nextRace.textContent = nextUpcomingCourse ? getDisplayCourseName(nextUpcomingCourse.course) : "Saison complète";
  }
  if (playedCount) {
    const count = data.meta.playedCoursesCount ?? (lastPlayedCourse ? (data.palmares || []).filter((entry) => entry.isPlayed).length : 0);
    playedCount.textContent = `${count} course${count > 1 ? "s" : ""} déjà intégrée${count > 1 ? "s" : ""}`;
  }
  if (gapCopy && runnerUp) {
    gapCopy.textContent = `${formatPoints(leader.points - runnerUp.points)} points d'avance sur ${runnerUp.name}.`;
  }
}

function renderKpis(data) {
  const ranking = data.home.globalRanking;
  const leader = ranking[0];
  const runnerUp = ranking[1];
  const third = ranking[2];
  const leaderGap = leader.points - runnerUp.points;
  const podiumSpread = runnerUp.points - third.points;
  const leaderDetail = (data.details || []).find((player) => player.name === leader.name);
  const leaderSummary = leaderDetail ? computePlayerSummary(leaderDetail) : { wins: 0, podiums: 0 };
  const mostWinsPlayer = (data.details || [])
    .map((player) => ({ name: player.name, ...computePlayerSummary(player) }))
    .sort((a, b) => (b.wins - a.wins) || (b.podiums - a.podiums) || a.name.localeCompare(b.name, "fr"))[0];

  const nodes = {
    mostWinsPlayer: document.querySelector("[data-kpi-most-wins-player]"),
    mostWinsCount: document.querySelector("[data-kpi-most-wins-count]"),
    leaderGap: document.querySelector("[data-kpi-gap]"),
    podiumSpread: document.querySelector("[data-kpi-podium-spread]"),
    leaderPodiums: document.querySelector("[data-kpi-leader-podiums]"),
  };

  if (nodes.mostWinsPlayer) nodes.mostWinsPlayer.textContent = mostWinsPlayer ? mostWinsPlayer.name : "—";
  if (nodes.mostWinsCount) {
    const wins = mostWinsPlayer ? mostWinsPlayer.wins : 0;
    nodes.mostWinsCount.textContent = `${wins} victoire${wins > 1 ? "s" : ""}`;
  }
  if (nodes.leaderGap) nodes.leaderGap.textContent = `${formatPoints(leaderGap)} pts`;
  if (nodes.podiumSpread) nodes.podiumSpread.textContent = `${formatPoints(podiumSpread)} pts`;
  if (nodes.leaderPodiums) nodes.leaderPodiums.textContent = String(leaderSummary.podiums);
}

function renderGlobalRanking(data) {
  const tbody = document.querySelector("[data-global-ranking]");
  if (!tbody) return;
  const maxPoints = Math.max(...data.home.globalRanking.map((player) => player.points), 1);

  tbody.innerHTML = data.home.globalRanking
    .map((player) => `
      <tr>
        <td><span class="rank-badge ${getBadgeClass(player.rank)}">${player.rank}</span></td>
        <td>
          <span class="player-name">${player.name}</span>
          <div class="ranking-progress"><div class="ranking-progress-fill" style="width:${(player.points / maxPoints) * 100}%"></div></div>
        </td>
        <td class="points-cell">${formatPoints(player.points)}</td>
      </tr>
    `)
    .join("");
}

function renderTeamRanking(data) {
  const tbody = document.querySelector("[data-team-ranking]");
  if (!tbody) return;
  const maxPoints = Math.max(...data.home.teamRanking.map((team) => team.points), 1);

  tbody.innerHTML = data.home.teamRanking
    .map((team) => `
      <tr>
        <td><span class="rank-badge ${getBadgeClass(team.rank)}">${team.rank}</span></td>
        <td>
          <span class="player-name">${team.name}</span>
          <div class="ranking-progress"><div class="ranking-progress-fill is-team" style="width:${(team.points / maxPoints) * 100}%"></div></div>
        </td>
        <td class="points-cell">${Math.round(team.points)}</td>
      </tr>
    `)
    .join("");
}

function renderLogoStrip(data) {
  const container = document.querySelector("[data-logo-strip]");
  if (!container) return;

  container.innerHTML = data.home.progression.courses
    .filter((course) => course.played)
    .map((course) => `
      <div class="logo-card">
        ${course.logo ? `<img src="${course.logo}" alt="${course.name}">` : ""}
        <span>${getDisplayCourseName(course.name)}</span>
      </div>
    `)
    .join("");
}

function renderUpcomingHome(data) {
  const container = document.querySelector("[data-upcoming-home]");
  if (!container) return;

  container.innerHTML = (data.palmares || [])
    .filter((entry) => !entry.isPlayed)
    .map((entry) => `
      <div class="logo-card">
        ${entry.logo ? `<img src="${entry.logo}" alt="${entry.course}">` : ""}
        <span>${getDisplayCourseName(entry.course)}</span>
      </div>
    `)
    .join("");
}

function buildColors(count) {
  const palette = [
    "#173f74",
    "#c99800",
    "#2e72cf",
    "#bf6a31",
    "#6783a2",
    "#9a2d3a",
    "#1f7a5c",
    "#6a52a3",
    "#af7f10",
    "#476785",
    "#cf5645",
    "#6d7f95",
    "#3c4c61",
    "#8f5d28",
    "#3a8aa6",
    "#7b6e58",
  ];
  return Array.from({ length: count }, (_, index) => palette[index % palette.length]);
}

function withAlpha(color, alpha) {
  if (!color.startsWith("#")) return color;
  const value = color.slice(1);
  const normalized = value.length === 3 ? value.split("").map((char) => char + char).join("") : value;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyLegendHighlight(chart, colorMap, theme = {}) {
  const selectedIndex = chart.$selectedDatasetIndex ?? null;
  chart.data.datasets.forEach((dataset, index) => {
    const baseColor = colorMap.get(dataset.label) || "#173f74";
    const dimmed = selectedIndex !== null && selectedIndex !== index;
    dataset.borderColor = dimmed ? withAlpha(baseColor, theme.dimAlpha ?? 0.14) : baseColor;
    dataset.backgroundColor = dimmed ? withAlpha(baseColor, theme.dimAlpha ?? 0.14) : baseColor;
    dataset.borderWidth = selectedIndex === null ? (theme.borderWidth ?? 2.7) : (selectedIndex === index ? (theme.focusWidth ?? 4.6) : (theme.dimWidth ?? 1.35));
    dataset.pointRadius = selectedIndex === null ? (theme.pointRadius ?? 1.9) : (selectedIndex === index ? (theme.focusPointRadius ?? 3.2) : (theme.dimPointRadius ?? 0.8));
    dataset.pointHoverRadius = selectedIndex === null ? (theme.pointHoverRadius ?? 4.4) : (selectedIndex === index ? (theme.focusHoverRadius ?? 5.5) : (theme.dimHoverRadius ?? 2));
  });
  chart.update();
}

function getPlayerColorMap(data) {
  const players = data.home.globalRanking.map((player) => player.name);
  const colors = buildColors(players.length);
  return new Map(players.map((name, index) => [name, colors[index]]));
}

function createBackdropPlugin(theme = {}) {
  return {
    id: `chartBackdrop-${Math.random().toString(36).slice(2, 8)}`,
    beforeDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const { left, top, width, height } = chartArea;
      const gradient = ctx.createLinearGradient(0, top, 0, top + height);
      gradient.addColorStop(0, theme.bgTop || "rgba(255,255,255,0.85)");
      gradient.addColorStop(1, theme.bgBottom || "rgba(255,248,233,0.88)");
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.fillRect(left, top, width, height);
      if (theme.glow) {
        const glow = ctx.createRadialGradient(
          left + width * theme.glow.x,
          top + height * theme.glow.y,
          10,
          left + width * theme.glow.x,
          top + height * theme.glow.y,
          width * 0.45,
        );
        glow.addColorStop(0, theme.glow.color);
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(left, top, width, height);
      }
      ctx.restore();
    },
  };
}

function createCourseLogosPlugin(courses, logoByCourse, labelToPalmares, theme = {}) {
  const imageCache = new Map();
  return {
    id: `courseLogos-${Math.random().toString(36).slice(2, 8)}`,
    afterDraw(chart) {
      const xScale = chart.scales.x;
      const areaBottom = chart.chartArea.bottom;
      const ctx = chart.ctx;
      courses.forEach((course, index) => {
        const palmaresName = labelToPalmares.get(course.name) || course.name;
        const logo = logoByCourse.get(palmaresName);
        if (!logo) return;
        const x = xScale.getPixelForValue(index);
        let img = imageCache.get(logo);
        if (!img) {
          img = new Image();
          img.src = logo;
          imageCache.set(logo, img);
        }
        const logoW = theme.logoW ?? 34;
        const logoH = theme.logoH ?? 24;
        const logoY = theme.logoY ?? 10;
        const draw = () => ctx.drawImage(img, x - (logoW / 2), areaBottom + logoY, logoW, logoH);
        if (img.complete) draw();
        else img.onload = draw;
      });
    },
  };
}

function getChartTheme() {
  return {
    borderWidth: 2.7,
    focusWidth: 4.6,
    dimWidth: 1.35,
    pointRadius: 1.9,
    focusPointRadius: 3.2,
    dimPointRadius: 0.8,
    pointHoverRadius: 4.4,
    focusHoverRadius: 5.5,
    dimHoverRadius: 2,
    dimAlpha: 0.14,
    tension: 0.26,
    legendColor: "#44536b",
    legendBoxWidth: 28,
    tooltipBg: "#112036",
    tooltipTitle: "#fff8df",
    tooltipBody: "#f4efe3",
    tooltipBorder: "rgba(255,211,61,0.35)",
    gridColor: "rgba(17,32,54,0.08)",
    gridWidth: 1,
    bgTop: "rgba(255,255,255,0.85)",
    bgBottom: "rgba(255,248,233,0.88)",
    glow: { x: 0.88, y: 0.02, color: "rgba(255,211,61,0.18)" },
    logoW: 34,
    logoH: 24,
    logoY: 10,
  };
}

function renderPointsChart(data) {
  const canvas = document.querySelector("#pointsChart");
  if (!canvas || !window.Chart) return;

  const playedIndexes = data.home.progression.courses
    .map((course, index) => (course.played ? index : -1))
    .filter((index) => index >= 0);
  const courses = playedIndexes.map((index) => data.home.progression.courses[index]);
  const playerOrder = data.home.globalRanking.map((player) => player.name);
  const playerMap = new Map(data.home.progression.players.map((player) => [player.name, player]));
  const colorMap = getPlayerColorMap(data);
  const logoByCourse = new Map((data.palmares || []).map((entry) => [entry.course, entry.logo || null]));
  const labelToPalmares = new Map([
    ["Down Under", "Santos Tour Down Under"],
    ["UAE Tour", "UAE Tour"],
    ["Paris-Nice", "Paris-Nice"],
    ["Tirreno-Adriatico", "Tirreno-Adriatico"],
    ["Volta Catalunya", "Volta Catalunya"],
    ["Itzulia", "Itzulia Basque Country"],
    ["Romandie", "Tour de Romandie"],
    ["Vuelta Fem", "Vuelta Femenina"],
    ["Critérium", "Critérium du Dauphiné"],
  ]);
  const theme = getChartTheme();

  new Chart(canvas, {
    type: "line",
    data: {
      labels: courses.map((course) => getDisplayCourseName(course.name)),
      datasets: playerOrder.map((playerName) => {
        const player = playerMap.get(playerName);
        const color = colorMap.get(playerName);
        return {
          label: playerName,
          data: playedIndexes.map((courseIndex) => player.totals[courseIndex]),
          borderColor: color,
          backgroundColor: color,
          borderWidth: theme.borderWidth,
          pointRadius: theme.pointRadius,
          pointHoverRadius: theme.pointHoverRadius,
          pointHitRadius: 10,
          clip: 8,
          tension: theme.tension,
        };
      }),
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "bottom",
          onClick(_event, legendItem, legend) {
            const chart = legend.chart;
            chart.$selectedDatasetIndex = chart.$selectedDatasetIndex === legendItem.datasetIndex ? null : legendItem.datasetIndex;
            applyLegendHighlight(chart, colorMap, theme);
          },
          labels: {
            usePointStyle: true,
            pointStyle: "line",
            boxWidth: theme.legendBoxWidth,
            padding: 16,
            color: theme.legendColor,
            font: {
              family: "Arial",
              size: 12,
              weight: "700",
            },
          },
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipTitle,
          bodyColor: theme.tooltipBody,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          displayColors: true,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "rgba(0,0,0,0)",
            maxRotation: 0,
            minRotation: 0,
          },
          border: { display: false },
          grid: { display: false },
        },
        y: {
          grace: "10%",
          ticks: { display: false },
          border: { display: false },
          grid: {
            color: theme.gridColor,
            lineWidth: theme.gridWidth,
          },
        },
      },
      layout: {
        padding: { bottom: 34 },
      },
    },
    plugins: [
      createBackdropPlugin(theme),
      createCourseLogosPlugin(courses, logoByCourse, labelToPalmares, theme),
    ],
  });
}

function renderPositionChart(data) {
  const canvas = document.querySelector("#positionChart");
  if (!canvas || !window.Chart) return;

  const playedIndexes = data.home.progression.courses
    .map((course, index) => (course.played ? index : -1))
    .filter((index) => index >= 0);
  const courses = playedIndexes.map((index) => data.home.progression.courses[index]);
  const rankingsByCourse = playedIndexes.map((index) => data.home.progression.rankingsByCourse[index]);
  const players = data.home.globalRanking.map((player) => player.name);
  const colorMap = getPlayerColorMap(data);
  const logoByCourse = new Map((data.palmares || []).map((entry) => [entry.course, entry.logo || null]));
  const labelToPalmares = new Map([
    ["Down Under", "Santos Tour Down Under"],
    ["UAE Tour", "UAE Tour"],
    ["Paris-Nice", "Paris-Nice"],
    ["Tirreno-Adriatico", "Tirreno-Adriatico"],
    ["Volta Catalunya", "Volta Catalunya"],
    ["Itzulia", "Itzulia Basque Country"],
    ["Romandie", "Tour de Romandie"],
    ["Vuelta Fem", "Vuelta Femenina"],
    ["Critérium", "Critérium du Dauphiné"],
  ]);
  const theme = getChartTheme();

  new Chart(canvas, {
    type: "line",
    data: {
      labels: courses.map((course) => getDisplayCourseName(course.name)),
      datasets: players.map((name) => ({
        label: name,
        data: rankingsByCourse.map((course) => course.ranks[name]),
        borderColor: colorMap.get(name),
        backgroundColor: colorMap.get(name),
        borderWidth: theme.borderWidth,
        pointRadius: theme.pointRadius,
        pointHoverRadius: theme.pointHoverRadius,
        pointHitRadius: 10,
        clip: 8,
        tension: 0.22,
      })),
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "bottom",
          onClick(_event, legendItem, legend) {
            const chart = legend.chart;
            chart.$selectedDatasetIndex = chart.$selectedDatasetIndex === legendItem.datasetIndex ? null : legendItem.datasetIndex;
            applyLegendHighlight(chart, colorMap, theme);
          },
          labels: {
            usePointStyle: true,
            pointStyle: "line",
            boxWidth: theme.legendBoxWidth,
            padding: 16,
            color: theme.legendColor,
            font: {
              family: "Arial",
              size: 12,
              weight: "700",
            },
          },
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipTitle,
          bodyColor: theme.tooltipBody,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          displayColors: true,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "rgba(0,0,0,0)",
            maxRotation: 0,
            minRotation: 0,
          },
          border: { display: false },
          grid: { display: false },
        },
        y: {
          reverse: true,
          min: 1,
          max: data.meta.playersCount,
          grace: 0.3,
          ticks: { display: false },
          border: { display: false },
          grid: {
            color: theme.gridColor,
            lineWidth: theme.gridWidth,
          },
        },
      },
      layout: {
        padding: { bottom: 34 },
      },
    },
    plugins: [
      createBackdropPlugin(theme),
      createCourseLogosPlugin(courses, logoByCourse, labelToPalmares, theme),
    ],
  });
}

function renderPalmaresPage(data) {
  const entries = data.palmares || [];
  const playedEntries = entries.filter((entry) => entry.isPlayed);
  const upcomingEntries = entries.filter((entry) => !entry.isPlayed);

  const placeMeta = {
    first: { label: "1er", icon: "🏆", className: "is-first" },
    second: { label: "2e", icon: "🥈", className: "is-second" },
    third: { label: "3e", icon: "🥉", className: "is-third" },
    last: { label: "Dernière place", icon: "◉", className: "is-last" },
  };

  const playedCountNode = document.querySelector("[data-palmares-count]");
  const upcomingCountNode = document.querySelector("[data-upcoming-count]");
  const lastWinnerNode = document.querySelector("[data-last-winner]");

  if (playedCountNode) playedCountNode.textContent = String(playedEntries.length);
  if (upcomingCountNode) upcomingCountNode.textContent = String(upcomingEntries.length);
  if (lastWinnerNode) lastWinnerNode.textContent = playedEntries.length ? playedEntries[playedEntries.length - 1].first : "Aucun vainqueur";

  const tableMarkup = playedEntries
    .map((entry) => {
      const logo = entry.logo ? `<div class="palmares-course-logo"><img src="${entry.logo}" alt="${entry.course}"></div>` : "";
      return `
        <article class="palmares-row">
          <div class="palmares-course">
            ${logo}
            <div class="palmares-course-name">${getDisplayCourseName(entry.course)}</div>
          </div>
          <div class="palmares-cell ${placeMeta.first.className}">
            <span class="palmares-cell-label"><span class="palmares-cell-icon">${placeMeta.first.icon}</span>${placeMeta.first.label}</span>
            <span class="palmares-cell-value">${entry.first ?? "—"}</span>
          </div>
          <div class="palmares-cell ${placeMeta.second.className}">
            <span class="palmares-cell-label"><span class="palmares-cell-icon">${placeMeta.second.icon}</span>${placeMeta.second.label}</span>
            <span class="palmares-cell-value">${entry.second ?? "—"}</span>
          </div>
          <div class="palmares-cell ${placeMeta.third.className}">
            <span class="palmares-cell-label"><span class="palmares-cell-icon">${placeMeta.third.icon}</span>${placeMeta.third.label}</span>
            <span class="palmares-cell-value">${entry.third ?? "—"}</span>
          </div>
          <div class="palmares-cell ${placeMeta.last.className}">
            <span class="palmares-cell-label"><span class="palmares-cell-icon">${placeMeta.last.icon}</span>${placeMeta.last.label}</span>
            <span class="palmares-cell-value">${entry.last ?? "—"}</span>
          </div>
        </article>
      `;
    })
    .join("");

  const tableContainer = document.querySelector("[data-palmares-table]");
  if (tableContainer) tableContainer.innerHTML = tableMarkup;

  const upcomingContainer = document.querySelector("[data-upcoming-races]");
  if (upcomingContainer) {
    upcomingContainer.innerHTML = upcomingEntries
      .map((entry) => `
        <article class="upcoming-card">
          ${entry.logo ? `<img src="${entry.logo}" alt="${entry.course}">` : ""}
          <div class="upcoming-card-text">
            <strong>${getDisplayCourseName(entry.course)}</strong>
          </div>
        </article>
      `)
      .join("");
  }
}

function getCourseLogoMap(data) {
  const logos = new Map();
  (data.home.progression.courses || []).forEach((course) => {
    logos.set(course.name, course.logo || null);
  });
  return logos;
}

function getRankIcon(rank) {
  if (rank === 1) return "🏆";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

function formatRankLabel(rank) {
  if (rank === null || rank === undefined || rank === "") {
    return "—";
  }
  const icon = getRankIcon(rank);
  if (!icon) return String(rank);
  return `<span class="details-rank-icon">${icon}</span>${rank}`;
}

function renderDetailsPage(data) {
  const players = [...data.details].sort((a, b) => b.total - a.total);
  const playerCountNode = document.querySelector("[data-details-player-count]");
  const playedCoursesNode = document.querySelector("[data-details-played-courses]");
  const leaderNode = document.querySelector("[data-details-leader]");
  const cardsContainer = document.querySelector("[data-details-player-cards]");
  const chipsContainer = document.querySelector("[data-player-chips]");
  const focusName = document.querySelector("[data-focus-name]");
  const focusSub = document.querySelector("[data-focus-sub]");
  const focusKpis = {
    total: document.querySelector("[data-focus-total]"),
    wins: document.querySelector("[data-focus-wins]"),
    podiums: document.querySelector("[data-focus-podiums]"),
    dns: document.querySelector("[data-focus-dns]"),
  };
  const resultsContainer = document.querySelector("[data-focus-results]");
  const tableHead = document.querySelector("[data-details-table-head]");
  const tableBody = document.querySelector("[data-details-table-body]");
  const logoMap = getCourseLogoMap(data);
  const playedCourses = data.home.progression.courses.filter((course) => course.played);

  if (playerCountNode) playerCountNode.textContent = String(players.length);
  if (playedCoursesNode) playedCoursesNode.textContent = String(data.meta.playedCoursesCount);
  if (leaderNode) leaderNode.textContent = players[0]?.name ?? "—";

  if (cardsContainer) {
    cardsContainer.innerHTML = players
      .map((player, index) => {
        const summary = computePlayerSummary(player);
        return `
          <article class="details-player-card">
            <div class="details-player-rank">Rang ${index + 1}</div>
            <div class="details-player-name">${player.name}</div>
            <div class="details-player-total">${formatPoints(player.total)} points</div>
            <div class="details-player-meta">
              <span class="details-mini-pill ${summary.wins >= 1 ? "is-win" : ""}">🏆 ${summary.wins} victoire${summary.wins > 1 ? "s" : ""}</span>
              <span class="details-mini-pill ${summary.podiums >= 1 ? "is-podium" : ""}">▦ ${summary.podiums} podium${summary.podiums > 1 ? "s" : ""}</span>
              <span class="details-mini-pill ${summary.dns >= 1 ? "is-dns" : ""}">● ${summary.dns} DNS</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  if (chipsContainer) {
    chipsContainer.innerHTML = players
      .map((player, index) => `<button class="player-chip ${index === 0 ? "is-active" : ""}" type="button" data-player-name="${player.name}">${player.name}</button>`)
      .join("");
  }

  const updateFocus = (playerName) => {
    const player = players.find((entry) => entry.name === playerName) || players[0];
    const summary = computePlayerSummary(player);
    if (focusName) focusName.textContent = player.name;
    if (focusSub) focusSub.textContent = `${formatPoints(player.total)} points au total sur la saison en cours.`;
    if (focusKpis.total) focusKpis.total.textContent = formatPoints(player.total);
    if (focusKpis.wins) focusKpis.wins.textContent = String(summary.wins);
    if (focusKpis.podiums) focusKpis.podiums.textContent = String(summary.podiums);
    if (focusKpis.dns) focusKpis.dns.textContent = String(summary.dns);

    if (resultsContainer) {
      resultsContainer.innerHTML = playedCourses
        .map((course) => {
          const result = player.results.find((entry) => entry.course === course.name);
          const rank = result?.rank ?? null;
          const points = result?.points ?? 0;
          return `
            <article class="details-result-card">
              <div class="details-result-course">
                ${logoMap.get(course.name) ? `<img src="${logoMap.get(course.name)}" alt="${course.name}">` : ""}
                <strong>${getDisplayCourseName(course.name)}</strong>
              </div>
              <div class="details-result-values">
                <span class="details-value-pill ${points === 0 ? "is-zero" : ""}">Rang : ${formatRankLabel(rank)}</span>
                <span class="details-value-pill ${points === 0 ? "is-zero" : ""}">${formatPoints(points)} pts</span>
              </div>
            </article>
          `;
        })
        .join("");
    }

    document.querySelectorAll("[data-player-name]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.playerName === player.name);
    });
  };

  if (chipsContainer) {
    chipsContainer.addEventListener("click", (event) => {
      const button = event.target.closest("[data-player-name]");
      if (!button) return;
      updateFocus(button.dataset.playerName);
    });
  }

  if (tableHead) {
    tableHead.innerHTML = `
      <tr>
        <th class="details-table-player">Joueur</th>
        ${playedCourses.map((course) => `<th class="details-table-course">${getDisplayCourseName(course.name)}</th>`).join("")}
      </tr>
    `;
  }

  if (tableBody) {
    tableBody.innerHTML = players
      .map((player) => `
        <tr>
          <td class="details-table-player">
            <strong>${player.name}</strong>
            <span class="details-table-points">${formatPoints(player.total)} pts</span>
          </td>
          ${playedCourses
            .map((course) => {
              const result = player.results.find((entry) => entry.course === course.name);
              if (!result || result.rank === null || result.rank === undefined || result.rank === "") {
                return `<td class="details-table-course"><span class="details-empty">—</span></td>`;
              }
              const dnsClass = result.rank === "DNS" ? "is-dns" : "";
              return `
                <td class="details-table-course">
                  <span class="details-table-rank ${dnsClass}">${formatRankLabel(result.rank)}</span>
                  <span class="details-table-points">${formatPoints(result.points)} pts</span>
                </td>
              `;
            })
            .join("")}
        </tr>
      `)
      .join("");
  }

  updateFocus(players[0]?.name);
}

function setupSectionNav() {
  const navLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
  if (!navLinks.length) return;

  const sections = navLinks
    .map((link) => {
      const target = document.querySelector(link.getAttribute("href"));
      return target ? { link, target } : null;
    })
    .filter(Boolean);

  if (!sections.length) return;

  const updateActiveSection = () => {
    const offset = window.scrollY + 180;
    let active = sections[0];
    sections.forEach((section) => {
      if (section.target.offsetTop <= offset) {
        active = section;
      }
    });
    sections.forEach((section) => {
      section.link.classList.toggle("is-active", section === active);
    });
  };

  window.addEventListener("scroll", updateActiveSection, { passive: true });
  updateActiveSection();
}

async function boot() {
  const hasHome = Boolean(document.querySelector("[data-global-ranking]"));
  const hasPalmares = Boolean(document.querySelector("[data-palmares-table]"));
  const hasDetails = Boolean(document.querySelector("[data-details-player-cards]"));

  if (!hasHome && !hasPalmares && !hasDetails) return;

  try {
    const data = await loadData();
    renderMeta(data);

    if (hasHome) {
      renderHero(data);
      renderKpis(data);
      renderGlobalRanking(data);
      renderTeamRanking(data);
      renderLogoStrip(data);
      renderUpcomingHome(data);
      renderPointsChart(data);
      renderPositionChart(data);
    }

    if (hasPalmares) {
      renderPalmaresPage(data);
    }

    if (hasDetails) {
      renderDetailsPage(data);
    }
  } catch (error) {
    const fallback = document.querySelector("[data-page-error]");
    if (fallback) {
      fallback.hidden = false;
      fallback.textContent = error.message;
    }
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", boot);
document.addEventListener("DOMContentLoaded", setupBackToTop);
document.addEventListener("DOMContentLoaded", setupSectionNav);
