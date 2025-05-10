var boardDiv = document.getElementById("bingo-board");

var questionFilter = {
  difficulty: "", // "EASY", "MEDIUM", "HARD"
  canPremium: false,
}

var boardState = {
  n: 5,
  squares: [],
}

var players = ["Dragonlinae", "cpcs"];
var colors = ["#45b2ff", "#d83b3b"];
var startTime = 0;
var gameCode = "";

function fetchResource(input, init) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "fetchResource", input, init }, messageResponse => {
      const [response, error] = messageResponse;
      if (response === null) {
        reject(error);
      } else {
        const body = response.body ? new Blob([response.body]) : undefined;
        resolve(new Response(body, {
          status: response.status,
          statusText: response.statusText,
        }));
      }
    });
  });
}

function getQuestionData(titleSlug) {
  return fetchResource("https://leetcode.com/graphql/", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      query: `
        query questionTitle($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionId
            questionFrontendId
            title
            titleSlug
            isPaidOnly
            difficulty
            likes
            dislikes
            categoryTitle
          }
        }
      `,
      variables: {
        titleSlug: titleSlug
      },
      operationName: "questionTitle"
    })
  })
    .then(response => response.json())
    .then(data => {
      console.log(data);
      return data.data.question;
    });
}


function randomQuestionSlug(filter) {
  var query = {
    query: `
      query randomQuestion($categorySlug: String, $filters: QuestionListFilterInput) {
        randomQuestion(categorySlug: $categorySlug, filters: $filters) {
          title
          titleSlug
          difficulty
          isPaidOnly
        }
      }
    `,
    variables: {
      categorySlug: "all-code-essentials",
      filters: {}
    },
    operationName: "randomQuestion"
  }

  if (filter.difficulty) {
    query.variables.filters.difficulty = filter.difficulty;
  }

  return fetchResource("https://leetcode.com/graphql/", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(query)
  })
    .then(response => response.json())
    .then(data => {
      console.log(data);
      if (!filter.canPremium && data.data.randomQuestion.isPaidOnly) {
        return randomQuestionSlug(filter);
      }
      if (boardState.squares.find(square => square.titleSlug === data.data.randomQuestion.titleSlug)) {
        return randomQuestionSlug(filter);
      }
      return data.data.randomQuestion;
    });
}

function getRecentSubmissions(user) {
  return fetchResource("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      query: `
        query getRecentSubmissionList($username: String!, $limit: Int) {
          recentSubmissionList(username: $username, limit: $limit) {
            title
            titleSlug
            timestamp
            statusDisplay
            lang
            __typename
          }
        }
      `,
      variables: {
        username: user
      }
    })
  })
    .then(response => response.json())
    .then(data => {
      return data.data.recentSubmissionList;
    });
}


function updateBoard() {
  Promise.all(players.map((player, i) => getRecentSubmissions(player).then(submissions => {
    for (let j = 0; j < submissions.length; ++j) {
      const submission = submissions[j];
      if (submission.statusDisplay !== "Accepted") {
        continue;
      }
      const titleSlug = submission.titleSlug;
      const square = boardState.squares.find(square => square.titleSlug === titleSlug);
      if (square && square.selected !== i + 1 && submission.timestamp > startTime / 1000 && (square.selected === 0 || square.timestamp > submission.timestamp)) {
        square.selected = i + 1;
        square.timestamp = submission.timestamp;
        square.div.style.backgroundColor = colors[i];
        square.div.classList.add("selected");
      }
    }
  }))).then(() => {

    var player1Score = 0;
    var player2Score = 0;

    var player1rows = new Array(5).fill(0).map(() => [0, 0])
    var player1cols = new Array(5).fill(0).map(() => [0, 0])
    var player1diag = new Array(2).fill(0).map(() => [0, 0])

    var player2rows = new Array(5).fill(0).map(() => [0, 0])
    var player2cols = new Array(5).fill(0).map(() => [0, 0])
    var player2diag = new Array(2).fill(0).map(() => [0, 0])

    for (let i = 0; i < boardState.squares.length; i++) {
      if (boardState.squares[i].selected === 1) {
        player1Score++;
        player1rows[Math.floor(i / boardState.n)][0]++;
        player1rows[Math.floor(i / boardState.n)][1] = Math.max(player1rows[Math.floor(i / boardState.n)][1], boardState.squares[i].timestamp);
        player1cols[i % boardState.n][0]++;
        player1cols[i % boardState.n][1] = Math.max(player1cols[i % boardState.n][1], boardState.squares[i].timestamp);
        if (i % (boardState.n) === Math.floor(i / boardState.n)) {
          player1diag[0][0]++;
          player1diag[0][1] = Math.max(player1diag[0][1], boardState.squares[i].timestamp);
        }
        if (i % (boardState.n) === boardState.n - Math.floor(i / boardState.n) - 1) {
          player1diag[1][0]++;
          player1diag[1][1] = Math.max(player1diag[1][1], boardState.squares[i].timestamp);
        }
      } else if (boardState.squares[i].selected === 2) {
        player2Score++;
        player2rows[Math.floor(i / boardState.n)][0]++;
        player2rows[Math.floor(i / boardState.n)][1] = Math.max(player2rows[Math.floor(i / boardState.n)][1], boardState.squares[i].timestamp);
        player2cols[i % boardState.n][0]++;
        player2cols[i % boardState.n][1] = Math.max(player2cols[i % boardState.n][1], boardState.squares[i].timestamp);
        if (i % (boardState.n) === Math.floor(i / boardState.n)) {
          player2diag[0][0]++;
          player2diag[0][1] = Math.max(player2diag[0][1], boardState.squares[i].timestamp);
        }
        if (i % (boardState.n) === boardState.n - Math.floor(i / boardState.n) - 1) {
          player2diag[1][0]++;
          player2diag[1][1] = Math.max(player2diag[1][1], boardState.squares[i].timestamp);
        }
      }
    }

    console.log(player1rows, player1cols, player1diag);
    console.log(player2rows, player2cols, player2diag);


    var player1Bingo = [false, Infinity];
    var player2Bingo = [false, Infinity];
    for (let i = 0; i < boardState.n; i++) {
      if (player1rows[i][0] === boardState.n) {
        player1Bingo[0] = true;
        player1Bingo[1] = Math.min(player1Bingo[1], player1rows[i][1]);
      }
      if (player2rows[i][0] === boardState.n) {
        player2Bingo[0] = true;
        player2Bingo[1] = Math.min(player2Bingo[1], player2rows[i][1]);
      }
      if (player1cols[i][0] === boardState.n) {
        player1Bingo[0] = true;
        player1Bingo[1] = Math.min(player1Bingo[1], player1cols[i][1]);
      }
      if (player2cols[i][0] === boardState.n) {
        player2Bingo[0] = true;
        player2Bingo[1] = Math.min(player2Bingo[1], player2cols[i][1]);
      }
    }
    for (let i = 0; i < 2; i++) {
      if (player1diag[i][0] === boardState.n) {
        player1Bingo[0] = true;
        player1Bingo[1] = Math.min(player1Bingo[1], player1diag[i][1]);
      }
      if (player2diag[i][0] === boardState.n) {
        player2Bingo[0] = true;
        player2Bingo[1] = Math.min(player2Bingo[1], player2diag[i][1]);
      }
    }

    document.getElementById("player1-score").textContent = player1Score;
    document.getElementById("player2-score").textContent = player2Score;

    if (player1Score > boardState.n * boardState.n / 2 || (player1Bingo[0] && player1Bingo[1] < player2Bingo[1])) {
      document.getElementById("player1-score").style.color = "limegreen";
      document.getElementById("player1-score").innerHTML += " &#129351;";
      alert(players[0] + " wins!");
    } else if (player2Score > boardState.n * boardState.n / 2 || (player2Bingo[0] && player2Bingo[1] < player1Bingo[1])) {
      document.getElementById("player2-score").style.color = "limegreen";
      document.getElementById("player2-score").innerHTML += " &#129351;";
      alert(players[1] + " wins!");
    }
  });
}

function createBoard(n = 5) {
  boardState = {};
  boardState.n = n;
  boardState.squares = [];
  for (let i = 0; i < n * n; i++) {
    boardState.squares.push({
      title: "",
      titleSlug: "",
      selected: 0,
      timestamp: 0,
      div: null,
    });
  }

  boardDiv.innerHTML = "";
  for (let i = 0; i < n * n; i++) {
    const square = document.createElement("button");
    square.classList.add("bingo-square");

    randomQuestionSlug(questionFilter).then(data => {
      const squareText = document.createElement("p");
      squareText.classList.add("square-text");
      squareText.textContent = data.title;
      square.appendChild(squareText);
      square.onclick = () => {
        chrome.tabs.create({
          url: `https://leetcode.com/problems/${data.titleSlug}/`,
        });
      }
      boardState.squares[i].title = data.title;
      boardState.squares[i].titleSlug = data.titleSlug;
    });

    boardDiv.appendChild(square);
    boardState.squares[i].div = square;
  }
}

function setupBoard() {
  boardDiv.innerHTML = "";
  for (let i = 0; i < boardState.squares.length; i++) {
    const squareData = boardState.squares[i];
    const square = document.createElement("button");
    square.classList.add("bingo-square");
    const squareText = document.createElement("p");
    squareText.classList.add("square-text");
    squareText.textContent = squareData.title;
    square.appendChild(squareText);
    square.onclick = () => {
      chrome.tabs.create({
        url: `https://leetcode.com/problems/${squareData.titleSlug}/`,
      });
    }
    square.style.backgroundColor = squareData.selected ? colors[squareData.selected - 1] : "";
    boardDiv.appendChild(square);
    boardState.squares[i].div = square;
  }
}

function prettifyQuestionTitle(title) {
  return title.split("-").map(word => {
    return word[0].toUpperCase() + word.slice(1);
  }).join(" ");
}

function updateInfo() {
  document.getElementById("player1-name").textContent = players[0];
  document.getElementById("player1-name").style.color = colors[0];
  document.getElementById("player2-name").textContent = players[1];
  document.getElementById("player2-name").style.color = colors[1];
  document.getElementById("difficulty").textContent = questionFilter.difficulty || "All";
  document.getElementById("premium").textContent = questionFilter.canPremium ? "Yes" : "No";
  document.getElementById("start-time").textContent = new Date(startTime).toLocaleTimeString();
}

async function startGame() {
  players = await chrome.runtime.sendMessage({ type: "getPlayers" });
  questionFilter = await chrome.runtime.sendMessage({ type: "getFilter" });
  boardSize = await chrome.runtime.sendMessage({ type: "getBoardSize" });
  startTime = await chrome.runtime.sendMessage({ type: "getStartTime" });
  boardState = await chrome.runtime.sendMessage({ type: "getBoardState" });

  if (boardState === null) {
    createBoard(boardSize);
  } else {
    setupBoard();
  }

  boardState.n = parseInt(boardState.n);

  updateInfo();
  runClock();

  document.getElementById("game-code-copy").onclick = async function () {
    console.log("copying game code");
    await chrome.runtime.sendMessage({ type: "updateBoardState", boardState });
    gameCode = await chrome.runtime.sendMessage({ type: "getGameCode" });
    navigator.clipboard.writeText(gameCode);
    alert("Game code copied to clipboard");
  }
}

function runClock() {
  var timeLeft = startTime - Date.now();
  var timerDiv = document.getElementById("timer");
  if (timeLeft < 0) {
    timerDiv.innerText = "Game has started " + startTime + " " + Date.now();
    timerDiv.style.color = "green";

    timeLeft = Math.abs(timeLeft);
    var secondsLeft = Math.floor(timeLeft / 1000);
    var minutesLeft = Math.floor(secondsLeft / 60);
    var hoursLeft = Math.floor(minutesLeft / 60);
    secondsLeft = secondsLeft % 60;
    minutesLeft = minutesLeft % 60;
    if (hoursLeft < 10) {
      hoursLeft = "0" + hoursLeft;
    }
    if (minutesLeft < 10) {
      minutesLeft = "0" + minutesLeft;
    }
    if (secondsLeft < 10) {
      secondsLeft = "0" + secondsLeft;
    }
    timerDiv.innerText = hoursLeft + ":" + minutesLeft + ":" + secondsLeft;

    document.getElementById("bingo-board").style.display = "grid";
    document.getElementById("bingo-board").style.gridTemplate = `repeat(${boardState.n}, 1fr) / repeat(${boardState.n}, 1fr)`;
  } else {
    var secondsLeft = Math.floor(timeLeft / 1000);
    var minutesLeft = Math.floor(secondsLeft / 60);
    var hoursLeft = Math.floor(minutesLeft / 60);
    secondsLeft = secondsLeft % 60;
    minutesLeft = minutesLeft % 60;
    if (hoursLeft > 0) {
      timerDiv.innerText = "Starts in " + hoursLeft + " hours and " + minutesLeft + " minutes " + secondsLeft + " seconds";
    } else if (minutesLeft > 0) {
      timerDiv.innerText = "Starts in " + minutesLeft + " minutes " + secondsLeft + " seconds";
    } else {
      timerDiv.innerText = "Starts in " + secondsLeft + " seconds";
    }
  }
  setTimeout(runClock, 1000);
}

startGame();
setInterval(updateBoard, 60000);
updateBoard();