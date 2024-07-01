let currentQuestion = 0;
let score = 0;
let currentQuestions = [];
let incorrectQuestions = [];
let difficulty = "";
let selectedCategory = "";
let numQuestions = 10;
let selectedLicenseType = ""; 
let allQuestions = [];
let answeredQuestions = new Set();
let questionCards = [];
let currentUser = null;
let isPracticeMode = false;
let userStats = {};
let userRank = 0;
let isCompetitionMode = false;
let competitionStartTime;

const TIME_PER_QUESTION = {
  easy: 40,
  medium: 30,
  hard: 20,
};

const initGame = () => {
  currentQuestion = 0;
  score = 0;
  incorrectQuestions = [];
  numQuestions = parseInt(document.getElementById("num-questions").value);
  isPracticeMode = document.getElementById("practice-mode").checked;
  
  let availableQuestions = allQuestions.filter(q => !answeredQuestions.has(q.id));
  if (availableQuestions.length < numQuestions) {
    answeredQuestions.clear();
    availableQuestions = allQuestions;
  }
  
  currentQuestions = selectQuestions(numQuestions, availableQuestions);
  
  if (currentQuestions.length === 0) {
    alert("אין שאלות זמינות עבור הקריטריונים שנבחרו. אנא בחר קטגוריה או סוג רישיון אחר.");
    return;
  }

  hideElement("menu");
  hideElement("end-screen");
  hideElement("question-cards");
  showElement("game");
  showElement("back-to-menu");
  displayHighScore();
  displayQuestion();
  updateScore();
  updateProgressBar();

  if (isCompetitionMode) {
    initCompetitionMode();
  }
};

function getFileName(url) {
  return url.split('/').pop();
}

const selectQuestions = (amount, availableQuestions) => {
  let selectedQuestions = availableQuestions.filter((q) => 
    (selectedCategory === "all" || q.category === selectedCategory) && 
    q.licenseTypes.includes(selectedLicenseType)
  );
  let shuffled = selectedQuestions.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(amount, shuffled.length));
};

const displayQuestion = () => {
  if (!isPracticeMode) {
    stopTimer();
  }
  if (currentQuestion >= currentQuestions.length || currentQuestions.length === 0) {
    endGame();
    return;
  }

  let questionData = currentQuestions[currentQuestion];
  document.getElementById("question").textContent = questionData.question;

  let optionsContainer = document.getElementById("options");
  optionsContainer.innerHTML = "";
  questionData.options.forEach((option, index) => {
    let button = document.createElement("button");
    button.textContent = option;
    button.onclick = () => checkAnswer(index);
    optionsContainer.appendChild(button);
  });

  if (questionData.image) {
    let img = document.createElement("img");
    img.src = "./images/" + getFileName(questionData.image);
    document.getElementById("question-image").innerHTML = "";
    document.getElementById("question-image").appendChild(img);
  } else {
    document.getElementById("question-image").innerHTML = "";
  }

  document.getElementById("explanation").style.display = "none";

  if (!isPracticeMode) {
    startTimer();
  }
  updateProgressBar();
};

const checkAnswer = (selectedIndex) => {
  if (!isPracticeMode) {
    stopTimer();
  }
  let questionData = currentQuestions[currentQuestion];
  let correctIndex = questionData.correctAnswer;
  
  answeredQuestions.add(questionData.id);
  
  let buttons = document.querySelectorAll('#options button');
  buttons[selectedIndex].classList.add('selected');
  
  if (selectedIndex === correctIndex) {
    score++;
    updateScore();
    showFeedback(true);
    removeFromDifficultQuestions(questionData.id);
  } else {
    showFeedback(false);
    incorrectQuestions.push({
      id: questionData.id,
      question: questionData.question,
      correctAnswer: questionData.options[correctIndex],
      userAnswer: questionData.options[selectedIndex],
    });
    
    showCorrectAnswer(correctIndex);
    addToDifficultQuestions(questionData.id);
  }
  
  if (isPracticeMode) {
    showExplanation(questionData.explanation);
    const continueButton = document.createElement("button");
    continueButton.textContent = "המשך";
    continueButton.onclick = () => {
      currentQuestion++;
      displayQuestion();
    };
    document.getElementById("options").appendChild(continueButton);
  } else {
    setTimeout(() => {
      currentQuestion++;
      displayQuestion();
    }, 3000);
  }
};

const showCorrectAnswer = (correctIndex) => {
  let buttons = document.querySelectorAll('#options button');
  buttons[correctIndex].classList.add('correct-answer');
  
  buttons[correctIndex].style.animation = 'pulse 0.5s infinite alternate';
  
  let crossmark = document.createElement('span');
  crossmark.innerHTML = '✗';
  crossmark.className = 'crossmark';
  buttons[correctIndex].appendChild(crossmark);
};

const updateScore = () => {
  document.getElementById("score").textContent = `ניקוד: ${score}/${currentQuestions.length}`;
};

const showFeedback = (isCorrect) => {
  let feedbackElement = document.getElementById("feedback");
  feedbackElement.textContent = isCorrect ? "תשובה נכונה!" : "תשובה שגויה.";
  feedbackElement.style.color = isCorrect ? "var(--correct-color)" : "var(--incorrect-color)";
  setTimeout(() => {
    feedbackElement.textContent = "";
  }, 1500);
};

const showExplanation = (explanation) => {
  let explanationElement = document.getElementById("explanation");
  explanationElement.textContent = explanation;
  explanationElement.style.display = "block";
};

const showQuestionCards = () => {
  hideElement("menu");
  hideElement("game");
  hideElement("end-screen");
  showElement("question-cards");
  showElement("back-to-menu");
  
  const container = document.getElementById("question-cards");
  container.innerHTML = '<h2>בחר קטגוריה</h2>';
  
  const categoryMenu = document.createElement("div");
  categoryMenu.id = "category-menu";
  
  const allCategoriesCard = createCategoryCard("כל הקטגוריות", "all");
  categoryMenu.appendChild(allCategoriesCard);
  
  for (let category in questions) {
    const card = createCategoryCard(getCategoryDisplayName(category), category);
    categoryMenu.appendChild(card);
  }
  
  container.appendChild(categoryMenu);
};

const createCategoryCard = (displayName, category) => {
  const card = document.createElement("div");
  card.className = "category-card";
  card.innerHTML = `
    <h3>${displayName}</h3>
    <div class="category-icon">${getCategoryIcon(category)}</div>
  `;
  card.onclick = () => showCategoryCards(category);
  return card;
};

const getCategoryDisplayName = (category) => {
  const displayNames = {
    "all": "כל הקטגוריות",
    "traffic_signs": "תמרורים",
    "right_of_way": "זכות קדימה",
    "speed": "מהירות",
    "driving_rules": "חוקי נהיגה",
    "pedestrians": "הולכי רגל",
    "mechanical_knowledge": "ידע מכני",
    "parking": "חניה",
    "emergency": "מצבי חירום"
  };
  return displayNames[category] || category;
};

const getCategoryIcon = (category) => {
  const icons = {
    "all": "🚦",
    "traffic_signs": "🚸",
    "right_of_way": "🔀",
    "speed": "🏎️",
    "driving_rules": "📜",
    "pedestrians": "🚶",
    "mechanical_knowledge": "🔧",
    "parking": "🅿️",
    "emergency": "🚨",
    "vehicle_familiarity": "🚗",
    "safety": "🦺",
    "road_signs": "🛑",
    "traffic_laws": "⚖️"
  };
  return icons[category] || "🚗";
};

const showCategoryCards = (category) => {
  const container = document.getElementById("question-cards");
  container.innerHTML = `
    <h2>${getCategoryDisplayName(category)}</h2>
    <button id="back-to-categories" class="floating-btn">חזרה לכל הקטגוריות</button>
  `;
  
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "cards-container";
  
  const categoryQuestions = category === "all" ? allQuestions : questions[category];
  for (let i = 0; i < categoryQuestions.length; i += 50) {
    const cardQuestions = categoryQuestions.slice(i, i + 50);
    const card = createQuestionCard(cardQuestions, i / 50 + 1);
    cardsContainer.appendChild(card);
  }
  
  container.appendChild(cardsContainer);
  
  document.getElementById("back-to-categories").onclick = showQuestionCards;
};

const getQuestionSetIcon = (setNumber) => {
  const icons = [
    "🚗", "🛑", "🔧", "🦺", "🚸"
  ];
  return icons[setNumber % icons.length];
};

const createQuestionCard = (cardQuestions, cardNumber) => {
  const card = document.createElement("div");
  card.className = "question-card";
  const answered = cardQuestions.filter(q => answeredQuestions.has(q.id)).length;
  const correct = cardQuestions.filter(q => answeredQuestions.has(q.id) && !incorrectQuestions.some(iq => iq.id === q.id)).length;
  
  card.innerHTML = `
    <div class="card-icon">${getQuestionSetIcon(cardNumber - 1)}</div>
    <h3>סט שאלות ${cardNumber}</h3>
    <div class="card-progress">
      <div class="card-progress-inner" style="width: ${(answered / cardQuestions.length) * 100}%"></div>
    </div>
    <p>נענו: ${answered} מתוך ${cardQuestions.length}</p>
    <p>נכונות: ${correct} מתוך ${answered}</p>
  `;
  card.onclick = () => startCardQuiz(cardQuestions);
  return card;
};

const startCardQuiz = (cardQuestions) => {
  const unansweredQuestions = cardQuestions.filter(q => !answeredQuestions.has(q.id));
  if (unansweredQuestions.length === 0) {
    alert("ענית על כל השאלות בכרטיסיה זו. נסה כרטיסיה אחרת.");
    return;
  }
  
  currentQuestions = unansweredQuestions;
  currentQuestion = 0;
  score = 0;
  incorrectQuestions = [];
  
  hideElement("question-cards");
  showElement("game");
  
  displayQuestion();
  updateScore();
  updateProgressBar();
};

const endGame = () => {
  stopTimer();
  hideElement("game");
  showElement("end-screen");
  
  if (currentQuestions.length === 0) {
    document.getElementById("final-score").textContent = "לא נמצאו שאלות מתאימות";
    document.getElementById("compliment").textContent = "אנא נסה שוב עם קריטריונים אחרים";
  } else {
    document.getElementById("final-score").textContent = `הניקוד הסופי שלך: ${score}/${currentQuestions.length}`;
    showStats();
    showIncorrectQuestions();
    saveHighScore();
    showCompliment();
    updateUserStats();
    updateUserRank();
  }
  
  const viewCardsButton = document.createElement("button");
  viewCardsButton.textContent = "צפה בכרטיסיות השאלות";
  viewCardsButton.className = "main-btn";
  viewCardsButton.onclick = showQuestionCards;
  document.getElementById("end-screen").appendChild(viewCardsButton);

  if (isCompetitionMode) {
    endCompetitionMode();
  }

  checkAchievements();
};

const showStats = () => {
  if (currentQuestions.length === 0) {
    return;
  }
  
  let correctAnswers = score;
  let incorrectAnswers = currentQuestions.length - score;
  let percentage = (score / currentQuestions.length) * 100;

  let statsContainer = document.getElementById("stats");
  statsContainer.innerHTML = `
    <h3>סטטיסטיקות המשחק</h3>
    <p>תשובות נכונות: ${correctAnswers}</p>
    <p>תשובות שגויות: ${incorrectAnswers}</p>
    <p>אחוז הצלחה: ${percentage.toFixed(2)}%</p>
  `;
};

const showIncorrectQuestions = () => {
  let container = document.getElementById("incorrect-questions");
  if (incorrectQuestions.length === 0) {
    container.innerHTML = "<h3>כל התשובות היו נכונות. כל הכבוד!</h3>";
    return;
  }

  let html = "<h3>שאלות שענית עליהן לא נכון:</h3><ul>";
  incorrectQuestions.forEach((q) => {
    html += `<li>
      <p><strong>שאלה:</strong> ${q.question}</p>
      <p><strong>תשובה נכונה:</strong> ${q.correctAnswer}</p>
      <p><strong>התשובה שלך:</strong> ${q.userAnswer}</p>
    </li>`;
  });
  html += "</ul>";
  container.innerHTML = html;
};

const saveHighScore = () => {
  let currentHighScore = localStorage.getItem("highScore") || 0;
  if (score > currentHighScore) {
    localStorage.setItem("highScore", score);
    document.getElementById("high-score").textContent = `שיא חדש: ${score}!`;
  } else {
    displayHighScore();
  }
};

const displayHighScore = () => {
  let highScore = localStorage.getItem("highScore") || 0;
  document.getElementById("high-score").textContent = `השיא הנוכחי: ${highScore}`;
};

const showCompliment = () => {
  let percentage = (score / currentQuestions.length) * 100;
  let compliment = "";
  if (percentage === 100) {
    compliment =  "מושלם! אתה אלוף!";
  } else if (percentage >= 80) {
    compliment = "כל הכבוד! תוצאה מצוינת!";
  } else if (percentage >= 60) {
    compliment = "עבודה טובה! המשך להתאמן!";
  } else {
    compliment = "אל תתייאש, נסה שוב!";
  }
  document.getElementById("compliment").textContent = compliment;
};

let timer;
const startTimer = () => {
  let timeLeft = TIME_PER_QUESTION[difficulty];
  updateTimerDisplay(timeLeft);
  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay(timeLeft);
    if (timeLeft <= 0) {
      clearInterval(timer);
      checkAnswer(-1);
    }
  }, 1000);
};

const updateTimerDisplay = (timeLeft) => {
  let timerCircle = document.getElementById("timer-circle");
  let progress = ((TIME_PER_QUESTION[difficulty] - timeLeft) / TIME_PER_QUESTION[difficulty]) * 360;
  timerCircle.style.setProperty("--progress", `${progress}deg`);
  timerCircle.textContent = timeLeft;
};

const stopTimer = () => {
  clearInterval(timer);
};

const updateProgressBar = () => {
  let progress = (currentQuestion / currentQuestions.length) * 100;
  let progressBar = document.getElementById("progress-bar");
  progressBar.innerHTML = `<div id="progress-bar-inner" style="width: ${progress}%"></div>`;
};

const setDifficulty = (level) => {
  difficulty = level;
  document.querySelectorAll(".difficulty-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(level).classList.add("active");
  checkGameStart();
};

const setCategory = (category) => {
  selectedCategory = category;
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(category).classList.add("active");
  checkGameStart();
};

const checkGameStart = () => {
  const startButton = document.getElementById("start-game");
  if (difficulty && selectedCategory && selectedLicenseType) {
    startButton.disabled = false;
    startButton.classList.remove("disabled");
  } else {
    startButton.disabled = true;
    startButton.classList.add("disabled");
  }
};

const setLicenseType = (type) => {
  selectedLicenseType = type;
  document.querySelectorAll(".license-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(type).classList.add("active");
  checkGameStart();
};

const showMenu = () => {
  hideElement("game");
  hideElement("end-screen");
  hideElement("question-cards");
  hideElement("stats-screen");
  hideElement("back-to-menu");
  hideElement("customize-screen");
  showElement("menu");
  document.getElementById("user-area").style.display = 'block';
  document.getElementById("user-menu").style.display = 'none';
};

const showAuthScreen = () => {
  document.getElementById('auth-screen').style.display = 'flex';
};

const hideAuthScreen = () => {
  document.getElementById('auth-screen').style.display = 'none';
};

const switchAuthTab = (tab) => {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`${tab}-form`).classList.add('active');
};

const login = (email, password) => {
  // כאן תהיה הלוגיקה של התחברות מול השרת
  // לצורך הדוגמה, נניח שההתחברות הצליחה
  currentUser = { email: email, name: "משתמש" };
  hideAuthScreen();
  updateUIForLoggedInUser();
};

const register = (name, email, password) => {
  // כאן תהיה הלוגיקה של הרשמה מול השרת
  // לצורך הדוגמה, נניח שההרשמה הצליחה
  currentUser = { name: name, email: email };
  hideAuthScreen();
  updateUIForLoggedInUser();
};

const logout = () => {
  currentUser = null;
  updateUIForLoggedOutUser();
};

const updateUIForLoggedInUser = () => {
  document.getElementById('user-menu-btn').textContent = `שלום, ${currentUser.name || currentUser.email}`;
  document.getElementById('user-area').style.display = 'block';
  showMenu();
};

const updateUIForLoggedOutUser = () => {
  document.getElementById('user-menu-btn').textContent = 'שלום, אורח';
  document.getElementById('user-area').style.display = 'block';
  document.getElementById('user-menu').style.display = 'none';
  showAuthScreen();
};

const resetGame = () => {
  if (confirm("האם אתה בטוח שברצונך לאפס את המשחק? כל ההתקדמות שלך תימחק.")) {
    answeredQuestions.clear();
    incorrectQuestions = [];
    localStorage.removeItem("highScore");
    localStorage.removeItem("gameCustomization");
    userStats = {};
    
    // איפוס הגדרות המשחק
    difficulty = "medium";
    selectedCategory = "all";
    selectedLicenseType = "B";
    numQuestions = 10;
    isPracticeMode = false;
    isCompetitionMode = false;
    
    // איפוס הצבעים וגודל הגופן לברירת המחדל
    document.documentElement.style.removeProperty('--background-color');
    document.documentElement.style.removeProperty('--text-color');
    document.body.style.fontSize = '';
    
    // איפוס אלמנטים בממשק המשתמש
    document.getElementById("bg-color").value = "#ffffff";
    document.getElementById("text-color").value = "#000000";
    document.getElementById("font-size").value = "16";
    document.getElementById("num-questions").value = "10";
    document.getElementById("practice-mode").checked = false;
    
    // עדכון הממשק
    setDifficulty("medium");
    setCategory("all");
    setLicenseType("B");
    updateUIForLoggedInUser();
    showMenu();
    displayHighScore();
    
    alert("המשחק אופס בהצלחה!");
  }
};

const toggleUserMenu = () => {
  const menu = document.getElementById('user-menu');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
};

const updateUserStats = () => {
  if (!currentUser) return;

  const date = new Date().toISOString().split('T')[0];
  if (!userStats[date]) {
    userStats[date] = { gamesPlayed: 0, correctAnswers: 0, totalQuestions: 0, categories: {}, competitions: { count: 0, totalTime: 0, totalAccuracy: 0 } };
  }

  userStats[date].gamesPlayed++;
  userStats[date].correctAnswers += score;
  userStats[date].totalQuestions += currentQuestions.length;

  // עדכון סטטיסטיקות לפי קטגוריה
  currentQuestions.forEach((q, index) => {
    if (!userStats[date].categories[q.category]) {
      userStats[date].categories[q.category] = { correct: 0, total: 0 };
    }
    userStats[date].categories[q.category].total++;
    if (index < score) {
      userStats[date].categories[q.category].correct++;
    }
  });

  // עדכון סטטיסטיקות תחרות
  if (isCompetitionMode) {
    const competitionTime = Math.floor((Date.now() - competitionStartTime) / 1000);
    const accuracy = (score / currentQuestions.length) * 100;
    
    userStats[date].competitions.count++;
    userStats[date].competitions.totalTime += competitionTime;
    userStats[date].competitions.totalAccuracy += accuracy;
    
    userStats[date].competitions.averageTime = userStats[date].competitions.totalTime / userStats[date].competitions.count;
    userStats[date].competitions.averageAccuracy = userStats[date].competitions.totalAccuracy / userStats[date].competitions.count;
  }

  localStorage.setItem('userStats', JSON.stringify(userStats));
};

const showStatsScreen = () => {
  hideElement("menu");
  showElement("stats-screen");

  const statsContent = document.getElementById("stats-content");
  statsContent.innerHTML = "<h3>סטטיסטיקות אחרונות:</h3>";

  const dates = Object.keys(userStats).sort().reverse().slice(0, 7);
  dates.forEach(date => {
    const stats = userStats[date];
    const percentage = ((stats.correctAnswers / stats.totalQuestions) * 100).toFixed(2);
    let html = `
      <div>
        <h4>${date}</h4>
        <p>משחקים: ${stats.gamesPlayed}</p>
        <p>תשובות נכונות: ${stats.correctAnswers} מתוך ${stats.totalQuestions}</p>
        <p>אחוז הצלחה: ${percentage}%</p>
    `;

    if (stats.competitions) {
      html += `
        <h5>תחרויות:</h5>
        <p>מספר תחרויות: ${stats.competitions.count}</p>
        <p>זמן ממוצע: ${formatTime(stats.competitions.averageTime)}</p>
        <p>דיוק ממוצע: ${stats.competitions.averageAccuracy.toFixed(2)}%</p>
      `;
    }

    html += '<h5>לפי קטגוריה:</h5>';

    for (let category in stats.categories) {
      const catStats = stats.categories[category];
      const catPercentage = ((catStats.correct / catStats.total) * 100).toFixed(2);
      html += `<p>${getCategoryDisplayName(category)}: ${catStats.correct} מתוך ${catStats.total} (${catPercentage}%)</p>`;
    }

    html += '</div>';
    statsContent.innerHTML += html;
  });
};

const animateElement = (element, animation) => {
  element.style.animation = animation;
  element.addEventListener('animationend', () => {
    element.style.animation = '';
  }, {once: true});
};

const showElement = (elementId) => {
  const element = document.getElementById(elementId);
  element.style.display = 'block';
  animateElement(element, 'fadeIn 0.5s');
};

const hideElement = (elementId) => {
  const element = document.getElementById(elementId);
  animateElement(element, 'fadeOut 0.5s');
  setTimeout(() => {
    element.style.display = 'none';
  }, 500);
};

const togglePracticeMode = () => {
  isPracticeMode = document.getElementById("practice-mode").checked;
  const timerContainer = document.getElementById("timer-container");
  timerContainer.style.display = isPracticeMode ? "none" : "block";
};

const updateUserRank = () => {
  const totalScore = Object.values(userStats).reduce((sum, day) => sum + day.correctAnswers, 0);
  const totalQuestions = Object.values(userStats).reduce((sum, day) => sum + day.totalQuestions, 0);
  const overallPercentage = (totalScore / totalQuestions) * 100;

  if (overallPercentage > 90) userRank = "מומחה";
  else if (overallPercentage > 80) userRank = "מתקדם";
  else if (overallPercentage > 70) userRank = "בינוני";
  else userRank = "מתחיל";

  document.getElementById("user-rank").textContent = `הדירוג שלך: ${userRank}`;
};

const startAdvancedPractice = () => {
  const difficultQuestions = allQuestions.filter(q => 
    userStats.difficultQuestions && userStats.difficultQuestions.includes(q.id)
  );

  if (difficultQuestions.length < 5) {
    alert("אין מספיק שאלות למצב אימון מתקדם. נסה לענות על יותר שאלות קודם.");
    return;
  }

  currentQuestions = shuffleArray(difficultQuestions).slice(0, numQuestions);
  isPracticeMode = true;
  initGame();
};

const startCompetition = () => {
  isCompetitionMode = true;
  difficulty = "hard";
  numQuestions = 20;
  initGame();
};

const customizeGame = () => {
  hideElement("menu");
  showElement("customize-screen");
};

const saveCustomization = () => {
  const bgColor = document.getElementById("bg-color").value;
  const textColor = document.getElementById("text-color").value;
  const fontSize = document.getElementById("font-size").value;

  document.documentElement.style.setProperty('--background-color', bgColor);
  document.documentElement.style.setProperty('--text-color', textColor);
  document.body.style.fontSize = `${fontSize}px`;

  localStorage.setItem('gameCustomization', JSON.stringify({bgColor, textColor, fontSize}));

  alert("ההתאמות האישיות נשמרו בהצלחה!");
  showMenu();
};

const loadCustomization = () => {
  const customization = JSON.parse(localStorage.getItem('gameCustomization'));
  if (customization) {
    document.documentElement.style.setProperty('--background-color', customization.bgColor);
    document.documentElement.style.setProperty('--text-color', customization.textColor);
    document.body.style.fontSize = `${customization.fontSize}px`;

    document.getElementById("bg-color").value = customization.bgColor;
    document.getElementById("text-color").value = customization.textColor;
    document.getElementById("font-size").value = customization.fontSize;
  }
};

const addToDifficultQuestions = (questionId) => {
  if (!userStats.difficultQuestions) {
    userStats.difficultQuestions = [];
  }
  if (!userStats.difficultQuestions.includes(questionId)) {
    userStats.difficultQuestions.push(questionId);
  }
  localStorage.setItem('userStats', JSON.stringify(userStats));
};

const removeFromDifficultQuestions = (questionId) => {
  if (userStats.difficultQuestions) {
    userStats.difficultQuestions = userStats.difficultQuestions.filter(id => id !== questionId);
    localStorage.setItem('userStats', JSON.stringify(userStats));
  }
};

const checkAchievements = () => {
  if (!userStats.achievements) {
    userStats.achievements = [];
  }

  const achievements = [
    { name: "מתחיל מבטיח", condition: () => userStats.gamesPlayed >= 5 },
    { name: "שולט בכביש", condition: () => calculatePercentage(userStats.correctAnswers, userStats.totalQuestions) >= 80 },
    { name: "מומחה תנועה", condition: () => userStats.categories && userStats.categories["traffic_signs"] && calculatePercentage(userStats.categories["traffic_signs"].correct, userStats.categories["traffic_signs"].total) >= 90 },
  ];

  achievements.forEach(achievement => {
    if (achievement.condition() && !userStats.achievements.includes(achievement.name)) {
      userStats.achievements.push(achievement.name);
      alert(`כל הכבוד! השגת את ההישג: ${achievement.name}`);
    }
  });

  localStorage.setItem('userStats', JSON.stringify(userStats));
};

const initCompetitionMode = () => {
  competitionStartTime = Date.now();

  const timerElement = document.createElement("div");
  timerElement.id = "competition-timer";
  document.getElementById("game").prepend(timerElement);

  const updateTimer = () => {
    const elapsedTime = Math.floor((Date.now() - competitionStartTime) / 1000);
    timerElement.textContent = `זמן: ${formatTime(elapsedTime)}`;
    if (currentQuestion < currentQuestions.length) {
      requestAnimationFrame(updateTimer);
    }
  };

  updateTimer();
};

const endCompetitionMode = () => {
  isCompetitionMode = false;
  const timerElement = document.getElementById("competition-timer");
  if (timerElement) {
    timerElement.remove();
  }

  const finalTime = document.getElementById("competition-timer").textContent.split(": ")[1];
  const accuracy = (score / currentQuestions.length) * 100;

  alert(`סיימת את התחרות!
זמן: ${finalTime}
דיוק: ${accuracy.toFixed(2)}%`);
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const calculatePercentage = (correct, total) => {
  return total === 0 ? 0 : (correct / total) * 100;
};

function applyCustomization() {
  const bgColor = document.getElementById("bg-color").value;
  const textColor = document.getElementById("text-color").value;
  const fontSize = document.getElementById("font-size").value;

  document.documentElement.style.setProperty('--background-color', bgColor);
  document.documentElement.style.setProperty('--text-color', textColor);
  document.body.style.fontSize = `${fontSize}px`;
}

// Event Listeners
document.getElementById("start-game").onclick = initGame;
document.getElementById("play-again").onclick = initGame;
document.getElementById("easy").onclick = () => setDifficulty("easy");
document.getElementById("medium").onclick = () => setDifficulty("medium");
document.getElementById("hard").onclick = () => setDifficulty("hard");
document.getElementById("start-advanced-practice").onclick = startAdvancedPractice;
document.getElementById("start-competition").onclick = startCompetition;
document.getElementById("customize-game").onclick = customizeGame;
document.getElementById("save-customization").onclick = saveCustomization;
document.getElementById("back-to-menu-from-customize").onclick = showMenu;

// Question count listeners
document.getElementById("question-count-minus").onclick = () => {
  let input = document.getElementById("num-questions");
  if (input.value > 1) {
    input.value = parseInt(input.value) - 1;
  }
};
document.getElementById("question-count-plus").onclick = () => {
  let input = document.getElementById("num-questions");
  if (input.value < 50) {
    input.value = parseInt(input.value) + 1;
  }
};

document.getElementById("back-to-menu").onclick = showMenu;
document.getElementById("view-question-cards").onclick = showQuestionCards;
document.getElementById('user-menu-btn').addEventListener('click', toggleUserMenu);
document.getElementById('reset-game').addEventListener('click', resetGame);
document.getElementById('view-stats').addEventListener('click', showStatsScreen);
document.getElementById('back-to-menu-from-stats').addEventListener('click', showMenu);
document.getElementById("practice-mode").addEventListener("change", togglePracticeMode);

// Customization listeners
document.getElementById("bg-color").addEventListener("input", applyCustomization);
document.getElementById("text-color").addEventListener("input", applyCustomization);
document.getElementById("font-size").addEventListener("input", applyCustomization);

// Initialize game on page load
window.onload = () => {
  setDifficulty("medium");
  setCategory("all");
  setLicenseType("B");
  displayHighScore();
  loadCustomization();
  
  // טעינת כל השאלות וקביעת מזהה ייחודי
  allQuestions = [];
  let id = 1;
  for (let category in questions) {
    questions[category].forEach(q => {
      q.id = id++;
      q.category = category;
      allQuestions.push(q);
    });
  }
  
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });

  document.querySelector('#login-form .auth-submit').addEventListener('click', () => {
    const email = document.querySelector('#login-form input[type="email"]').value;
    const password = document.querySelector('#login-form input[type="password"]').value;
    login(email, password);
  });

  document.querySelector('#register-form .auth-submit').addEventListener('click', () => {
    const name = document.querySelector('#register-form input[type="text"]').value;
    const email = document.querySelector('#register-form input[type="email"]').value;
    const password = document.querySelector('#register-form input[type="password"]').value;
    register(name, email, password);
  });

  document.getElementById('logout-btn').addEventListener('click', logout);

  // בדיקה אם המשתמש מחובר (למשל, מהסשן)
  if (!currentUser) {
    showAuthScreen();
  } else {
    updateUIForLoggedInUser();
  }

  // סגירת התפריט כשלוחצים מחוץ אליו
  document.addEventListener('click', (event) => {
    const userArea = document.getElementById('user-area');
    const userMenu = document.getElementById('user-menu');
    if (!userArea.contains(event.target) && userMenu.style.display === 'block') {
      userMenu.style.display = 'none';
    }
  });

  // טעינת סטטיסטיקות המשתמש מ-localStorage
  const savedStats = localStorage.getItem('userStats');
  if (savedStats) {
    userStats = JSON.parse(savedStats);
  }

  // יצירת כפתורי קטגוריות
  for (let category in questions) {
    let button = document.createElement("button");
    button.id = category;
    button.className = "category-btn";
    button.textContent = getCategoryDisplayName(category);
    button.onclick = () => setCategory(category);
    document.querySelector(".category-buttons").appendChild(button);
  }
};









