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
      return data.data.recentSubmissionList.map(submission => {
        return submission.title + " - " + submission.statusDisplay + " - " + submission.lang + "\n";
      }).join("");
    });
}

function initializeTimeInfo() {
  var startTimeDiv = document.getElementById("start-time");
  var today = new Date();
  today.setMinutes(today.getMinutes() + 10);
  var hours = today.getHours();
  var minutes = today.getMinutes();
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (hours < 10) {
    hours = "0" + hours;
  }
  console.log(hours + ":" + minutes);
  startTimeDiv.value = hours + ":" + minutes;
  updateTimeInfo(startTimeDiv.value);
  startTimeDiv.oninput = function () {
    updateTimeInfo(startTimeDiv.value);
  };
}

function updateTimeInfo(startTimeInput) {
  var startTime = startTimeInput;
  var [hours, minutes] = startTime.split(":");
  var today = new Date();
  today.setHours(hours);
  today.setMinutes(minutes);
  today.setSeconds(0);
  startTime = today.getTime();
  if (startTime < Date.now()) {
    today.setDate(today.getDate() + 1);
    startTime = today.getTime();
  }
  var timeLeft = startTime - Date.now();
  var minutesLeft = Math.floor(timeLeft / 60000);
  var hoursLeft = Math.floor(minutesLeft / 60);
  minutesLeft = minutesLeft % 60;
  if (hoursLeft > 0) {
    document.getElementById("time-info").innerText = "Starts in " + hoursLeft + " hours and " + minutesLeft + " minutes";
  } else {
    document.getElementById("time-info").innerText = "Starts in " + minutesLeft + " minutes";
  }
}

var newGameForm = document.getElementById("new-game");
newGameForm.onsubmit = function (event) {
  event.preventDefault();
  var player1 = document.getElementById("player1").value;
  var player2 = document.getElementById("player2").value;
  var filter = {
    difficulty: document.getElementById("difficulty").value,
    canPremium: document.getElementById("allow-premium").checked
  };
  var boardSize = document.getElementById("board-size").value;
  var startTime = document.getElementById("start-time").value;
  var [hours, minutes] = startTime.split(":");
  var today = new Date();
  today.setHours(hours);
  today.setMinutes(minutes);
  today.setSeconds(0);
  startTime = today.getTime();
  if (startTime < Date.now()) {
    today.setDate(today.getDate() + 1);
    startTime = today.getTime();
  }
  startGame(player1, player2, filter, boardSize, startTime);
};

var joinGameForm = document.getElementById("join-game");
joinGameForm.onsubmit = function (event) {
  event.preventDefault();
  var gameCode = document.getElementById("game-code").value;
  joinGame(gameCode);
};

function startGame(player1, player2, filter, boardSize, startTime) {
  console.log("Starting");
  if (player1 === "" || player2 === "") {
    alert("Please enter both player names.");
    return;
  }
  chrome.runtime.sendMessage({ type: "startGame", players: [player1, player2], filter, boardSize, startTime });
}

function joinGame(gameCode) {
  console.log("Joining");
  if (gameCode === "") {
    alert("Please enter a game code.");
    return;
  }
  chrome.runtime.sendMessage({ type: "joinGame", gameCode });
}

initializeTimeInfo();