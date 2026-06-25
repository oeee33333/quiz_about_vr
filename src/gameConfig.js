/**
 * Multiple-choice game configuration.
 *
 * Each question has a prompt and a list of answers. Exactly one answer per
 * question must have `correct: true`. The `explanation` text is shown on the
 * death screen when the player selects that wrong answer.
 *
 * The answer order is scrambled automatically on page load and on respawn,
 * so the correct path is different every run.
 */

export const GAME_CONFIG = {
  // Vertical layout constants for the level
  spawnY: 30,
  fallDeathY: -10,

  // Question 1: parkour split (2 answers, left/right platforms).
  // Question 2: building doors (4 answers).
  // Question 3: second-building elevators (3 answers).
  // Question 4: correct-elevator floor menu (4 answers).
  // Question 5: ground-floor garages (3 answers).
  questions: [
    {
      prompt: "Which of these is a mammal?",
      answers: [
        { text: "Dolphin", correct: true, explanation: "Dolphins are marine mammals, not fish." },
        { text: "Shark", correct: false, explanation: "Sharks are fish, not mammals." }
      ]
    },
    {
      prompt: "What is the largest planet in our solar system?",
      answers: [
        { text: "Saturn", correct: false, explanation: "Saturn is big, but Jupiter is larger." },
        { text: "Jupiter", correct: true, explanation: "Jupiter is the largest planet in our solar system." },
        { text: "Neptune", correct: false, explanation: "Neptune is the eighth planet and smaller than Jupiter." },
        { text: "Earth", correct: false, explanation: "Earth is the third planet and much smaller than Jupiter." }
      ]
    },
    {
      prompt: "Which gas do plants absorb from the atmosphere?",
      answers: [
        { text: "Carbon dioxide", correct: true, explanation: "Plants use carbon dioxide for photosynthesis." },
        { text: "Oxygen", correct: false, explanation: "Plants release oxygen, they do not absorb it for photosynthesis." },
        { text: "Nitrogen", correct: false, explanation: "Most plants cannot use atmospheric nitrogen directly." }
      ]
    },
    {
      prompt: "How many continents are there on Earth?",
      answers: [
        { text: "5", correct: false, explanation: "There are commonly considered to be 7 continents." },
        { text: "6", correct: false, explanation: "There are commonly considered to be 7 continents." },
        { text: "7", correct: true, explanation: "There are 7 continents: Africa, Antarctica, Asia, Australia, Europe, North America, and South America." },
        { text: "8", correct: false, explanation: "There are commonly considered to be 7 continents." }
      ]
    },
    {
      prompt: "Which of these is a primary color of light?",
      answers: [
        { text: "Red", correct: true, explanation: "Red is a primary color of light (RGB)." },
        { text: "Green", correct: false, explanation: "A truck rams you for choosing the wrong garage." },
        { text: "Yellow", correct: false, explanation: "A truck rams you for choosing the wrong garage." }
      ]
    }
  ]
};
