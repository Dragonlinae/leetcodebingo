chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Received", request);
  switch (request.type) {
    case "fetchResource":
      fetch(request.input, request.init).then(function (response) {
        return response.text().then(function (text) {
          sendResponse([{
            body: text,
            status: response.status,
            statusText: response.statusText,
          }, null]);
        });
      }, function (error) {
        sendResponse([null, error]);
      });
      break;
    case "startGame":
      startGame(request.players, request.filter, request.boardSize, request.startTime);
      return false;
      break;
    case "joinGame":
      joinGame(request.gameCode);
      return false;
      break;
    case "getPlayers":
      sendResponse(getPlayers());
      break;
    case "getFilter":
      sendResponse(getFilter());
      break;
    case "getBoardSize":
      sendResponse(getBoardSize());
      break;
    case "getStartTime":
      sendResponse(getStartTime());
      break;
    case "getBoardState":
      sendResponse(getBoardState());
      break;
    case "updateBoardState":
      updateBoardState(request.boardState);
      return false;
      break;
    case "getGameCode":
      sendResponse(getGameCode());
      break;
    default:
      return false;
  }
  return true;
});

var players = ["Dragonlinae", "cpcs"];
var filter = {
  difficulty: "",
  canPremium: false,
};
var boardSize = 5;
var startTime = 0;
var boardState = null;
var gameCode = "";

function encodeGameCode() {
  return btoa(JSON.stringify({
    players: players,
    filter: filter,
    boardSize: boardSize,
    startTime: startTime,
    boardState: boardState
  }));
}

function decodeGameCode(gameCode) {
  var decoded = JSON.parse(atob(gameCode));
  players = decoded.players;
  filter = decoded.filter;
  boardSize = decoded.boardSize;
  startTime = decoded.startTime;
  boardState = decoded.boardState;
  console.log("Decoded", players, filter, boardSize, startTime, boardState);
}


function startGame(_players, _filter, _boardSize, _startTime) {
  if (_players[0] === "" || _players[1] === "") {
    alert("Please enter both players");
    return false;
  }
  players = _players;
  filter = _filter;
  boardSize = _boardSize;
  startTime = _startTime;
  boardState = null;
  gameCode = encodeGameCode();

  chrome.windows.create({
    url: "bingo/board.html",
    type: "popup",
    width: 400,
    height: 600
  })
}

function joinGame(_gameCode) {
  gameCode = _gameCode;
  decodeGameCode(gameCode);
  chrome.windows.create({
    url: "bingo/board.html",
    type: "popup",
    width: 400,
    height: 600
  });
}

function updateBoardState(_boardState) {
  boardState = _boardState;
  gameCode = encodeGameCode();
}

function getPlayers() {
  return players;
}

function getFilter() {
  return filter;
}

function getBoardSize() {
  return boardSize;
}

function getStartTime() {
  return startTime;
}

function getBoardState() {
  console.log("getBoardState", boardState);
  return boardState;
}

function getStartTime() {
  return startTime;
}

function getGameCode() {
  gameCode = encodeGameCode();
  console.log("gameCode", gameCode);
  return gameCode;
}
